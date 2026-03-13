import { auth } from "@/lib/auth";
import { eventBus, type SSEEvent, type SSEClientEvent } from "@/lib/events/event-bus";
import { prisma } from "@app/db";

export const dynamic = "force-dynamic";

const KEEPALIVE_INTERVAL_MS = 30_000;

function getActorId(event: SSEEvent): string | undefined {
  if (event.type === "manual:published") return event.actorId;
  return undefined;
}

function toClientEvent(event: SSEEvent): SSEClientEvent {
  return {
    type: event.type,
    manualId: event.manualId,
    manualTitle: event.manualTitle,
    actorName: event.actorName,
  };
}

async function shouldDeliverEvent(
  event: SSEEvent,
  userId: string,
  userRole: string
): Promise<boolean> {
  // Never send events back to the actor
  if (event.type === "manual:published" && event.actorId === userId) {
    return false;
  }

  if (event.type === "manual:published") {
    // Admins see all publish events
    if (userRole === "ADMIN") return true;

    // Editors only see publish events for manuals they are assigned to
    const assignments = await prisma.manualAssignment.findMany({
      where: { userId, manualId: event.manualId },
    });
    return assignments.length > 0;
  }

  if (event.type === "manual:assigned" || event.type === "manual:unassigned") {
    // Only the affected editor receives assignment notifications
    return event.editorId === userId;
  }

  return false;
}

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user.id;
  const userRole = session.user.role;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream closed
        }
      }

      // Event listener
      const onEvent = async (event: SSEEvent) => {
        const deliver = await shouldDeliverEvent(event, userId, userRole);
        if (deliver) {
          const clientEvent = toClientEvent(event);
          send(`data: ${JSON.stringify(clientEvent)}\n\n`);
        }
      };

      eventBus.on("sse", onEvent);

      // Keepalive ping every 30s
      const pingInterval = setInterval(() => {
        send(`event: ping\ndata: {}\n\n`);
      }, KEEPALIVE_INTERVAL_MS);

      // Cleanup on cancel
      req.signal.addEventListener("abort", () => {
        eventBus.off("sse", onEvent);
        clearInterval(pingInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

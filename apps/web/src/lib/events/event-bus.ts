import { EventEmitter } from "events";

export type SSEEvent =
  | {
      type: "manual:published";
      manualId: string;
      manualTitle: string;
      actorId: string;
      actorName: string;
    }
  | {
      type: "manual:assigned";
      manualId: string;
      manualTitle: string;
      editorId: string;
      actorName: string;
    }
  | {
      type: "manual:unassigned";
      manualId: string;
      manualTitle: string;
      editorId: string;
      actorName: string;
    };

/** Client-side event type (no actorId/editorId leaked) */
export type SSEClientEvent =
  | {
      type: "manual:published";
      manualId: string;
      manualTitle: string;
      actorName: string;
    }
  | {
      type: "manual:assigned";
      manualId: string;
      manualTitle: string;
      actorName: string;
    }
  | {
      type: "manual:unassigned";
      manualId: string;
      manualTitle: string;
      actorName: string;
    };

class AppEventBus extends EventEmitter {
  override emit(event: "sse", data: SSEEvent): boolean {
    return super.emit(event, data);
  }

  override on(event: "sse", listener: (data: SSEEvent) => void): this {
    return super.on(event, listener);
  }

  override off(event: "sse", listener: (data: SSEEvent) => void): this {
    return super.off(event, listener);
  }
}

export const eventBus = new AppEventBus();

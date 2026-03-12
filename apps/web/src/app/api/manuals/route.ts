import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listManuals, createManual } from "@/lib/services/manual-service";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") as any || undefined;
  const assigneeId = searchParams.get("assigneeId") || undefined;
  const language = searchParams.get("language") || undefined;

  const result = await listManuals({ page, pageSize, search, status, assigneeId, language });
  return NextResponse.json(result);
}

const createManualSchema = z.object({
  productName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createManualSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const manual = await createManual(parsed.data, session.user.id);
  return NextResponse.json({ manual }, { status: 201 });
}

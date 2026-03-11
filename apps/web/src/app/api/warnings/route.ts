import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listWarnings, createWarning } from "@/lib/services/warning-service";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const severity = searchParams.get("severity") as any || undefined;

  const warnings = await listWarnings({ search, severity });
  return NextResponse.json({ warnings });
}

const createWarningSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  severity: z.enum(["DANGER", "WARNING", "CAUTION"]),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createWarningSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const warning = await createWarning(parsed.data);
  return NextResponse.json({ warning }, { status: 201 });
}

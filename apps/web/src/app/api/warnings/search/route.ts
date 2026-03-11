import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchWarnings } from "@/lib/services/warning-service";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  const warnings = await searchWarnings(q);
  return NextResponse.json({ warnings });
}

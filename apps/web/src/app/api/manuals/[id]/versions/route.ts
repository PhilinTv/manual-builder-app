import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getVersionHistory } from "@/lib/services/version-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const versions = await getVersionHistory(params.id);
  return NextResponse.json({
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      authorId: v.authorId,
      authorName: v.author.name,
      note: v.note,
      changeSummary: v.changeSummary,
      createdAt: v.createdAt.toISOString(),
    })),
  });
}

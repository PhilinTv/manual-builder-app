import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getVersion } from "@/lib/services/version-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const versionNumber = parseInt(params.version, 10);
  if (isNaN(versionNumber)) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }

  const version = await getVersion(params.id, versionNumber);
  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: version.id,
    version: version.version,
    manualId: version.manualId,
    content: version.content,
    authorId: version.authorId,
    authorName: version.author.name,
    note: version.note,
    changeSummary: version.changeSummary,
    createdAt: version.createdAt.toISOString(),
  });
}

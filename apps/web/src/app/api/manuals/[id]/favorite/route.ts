import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toggleFavorite } from "@/lib/services/favorite-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await toggleFavorite(session.user.id, params.id);
  return NextResponse.json(result);
}

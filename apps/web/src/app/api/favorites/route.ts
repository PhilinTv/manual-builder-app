import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserFavorites } from "@/lib/services/favorite-service";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const manualIds = await getUserFavorites(session.user.id);
  return NextResponse.json({ manualIds });
}

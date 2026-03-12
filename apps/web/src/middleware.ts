import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const userStatus = req.auth?.user?.status;

  // Auth pages - redirect authenticated users to dashboard
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (isLoggedIn && userStatus === "ACTIVE") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Pending page - allow for pending users
  if (pathname.startsWith("/pending")) {
    return NextResponse.next();
  }

  // API routes for auth - allow through
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // All other routes require authentication
  if (!isLoggedIn) {
    // API routes should return 401 instead of redirecting
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Pending users can only see pending page
  if (userStatus === "PENDING") {
    return NextResponse.redirect(new URL("/pending", req.url));
  }

  // Deactivated users get redirected to login
  if (userStatus === "DEACTIVATED") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin routes - only for admins
  if (pathname.startsWith("/admin")) {
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

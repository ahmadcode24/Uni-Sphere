import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "unisphere-default-fallback-secret-2026-key"
);

export const SESSION_COOKIE_NAME = "session_token";

interface SessionPayload {
  userId: string;
  email: string;
  role: "STUDENT" | "PRESIDENT" | "ADMIN";
  name: string;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let session: SessionPayload | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      session = payload as unknown as SessionPayload;
    } catch {
      session = null;
    }
  }

  const isAuthPage =
    pathname === "/login" || pathname === "/signup" || pathname === "/verify";

  // If already authenticated and trying to access auth pages (login/signup), redirect to role dashboard
  if (session && (pathname === "/login" || pathname === "/signup")) {
    const roleRedirect =
      session.role === "ADMIN"
        ? "/admin"
        : session.role === "PRESIDENT"
        ? "/president"
        : "/student";
    return NextResponse.redirect(new URL(roleRedirect, request.url));
  }

  // Protected route prefixes
  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/president") ||
    pathname.startsWith("/student");

  if (isProtected) {
    if (!session) {
      // Unauthenticated -> redirect to login with preserved next param
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role verification
    if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
      const fallback = session.role === "PRESIDENT" ? "/president" : "/student";
      return NextResponse.redirect(new URL(fallback, request.url));
    }

    if (pathname.startsWith("/president") && session.role !== "PRESIDENT") {
      const fallback = session.role === "ADMIN" ? "/admin" : "/student";
      return NextResponse.redirect(new URL(fallback, request.url));
    }

    if (pathname.startsWith("/student") && session.role !== "STUDENT") {
      const fallback = session.role === "ADMIN" ? "/admin" : "/president";
      return NextResponse.redirect(new URL(fallback, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/president/:path*",
    "/student/:path*",
    "/login",
    "/signup",
    "/verify",
  ],
};

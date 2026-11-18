import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyOtpCode } from "@/lib/otp";
import {
  verifyPreAuthToken,
  createSessionToken,
  PREAUTH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  sanitizeNextUrl,
  SessionPayload,
} from "@/lib/auth";

const verifySchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
  next: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const preAuthCookie = cookieStore.get(PREAUTH_COOKIE_NAME)?.value;

    if (!preAuthCookie) {
      return NextResponse.json(
        { error: "No active verification session found. Please sign in again." },
        { status: 401 }
      );
    }

    const preAuthPayload = await verifyPreAuthToken(preAuthCookie);
    if (!preAuthPayload) {
      return NextResponse.json(
        { error: "Verification session expired. Please sign in again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parseResult = verifySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid code format" },
        { status: 400 }
      );
    }

    const { code, next } = parseResult.data;

    // Verify OTP code
    const user = await verifyOtpCode(preAuthPayload.userId, code);

    // Create session token
    const sessionPayload: SessionPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as "STUDENT" | "PRESIDENT" | "ADMIN",
      name: user.name,
    };

    const sessionToken = await createSessionToken(sessionPayload);

    // Role default redirect
    const defaultRoute =
      user.role === "ADMIN"
        ? "/admin"
        : user.role === "PRESIDENT"
        ? "/president"
        : "/student";

    const targetUrl = sanitizeNextUrl(next, defaultRoute);

    const response = NextResponse.json({
      success: true,
      redirect: targetUrl,
      user: sessionPayload,
    });

    // Set session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Clear preauth cookie
    response.cookies.delete(PREAUTH_COOKIE_NAME);

    return response;
  } catch (error: any) {
    console.error("[Verify Error]:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: error.status || 400 }
    );
  }
}


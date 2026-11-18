export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyPreAuthToken, PREAUTH_COOKIE_NAME } from "@/lib/auth";
import { generateAndSendOtp } from "@/lib/otp";

export async function POST() {
  try {
    const cookieStore = cookies();
    const preAuthCookie = cookieStore.get(PREAUTH_COOKIE_NAME)?.value;

    if (!preAuthCookie) {
      return NextResponse.json(
        { error: "No active verification session. Please sign in again." },
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

    // Attempt to generate & send new OTP (will enforce 60s cooldown)
    await generateAndSendOtp(preAuthPayload.userId, preAuthPayload.email);

    return NextResponse.json({
      success: true,
      message: "A new verification code has been printed to the server terminal.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to resend code" },
      { status: error.status || 400 }
    );
  }
}


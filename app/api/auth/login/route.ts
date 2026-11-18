export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateAndSendOtp } from "@/lib/otp";
import { createPreAuthToken, PREAUTH_COOKIE_NAME } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Email or password is incorrect." },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Email or password is incorrect." },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Email or password is incorrect." },
        { status: 401 }
      );
    }

    // Generate & send OTP code to console
    await generateAndSendOtp(user.id, user.email);

    // Issue pre-auth cookie
    const preAuthToken = await createPreAuthToken({
      userId: user.id,
      email: user.email,
    });

    const response = NextResponse.json({
      success: true,
      message: "Verification code sent to your console.",
    });

    response.cookies.set({
      name: PREAUTH_COOKIE_NAME,
      value: preAuthToken,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error: any) {
    console.error("[Login Error]:", error);
    return NextResponse.json(
      { error: error.message || "Login failed" },
      { status: error.status || 500 }
    );
  }
}


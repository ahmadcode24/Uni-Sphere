export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateAndSendOtp } from "@/lib/otp";
import { createPreAuthToken, PREAUTH_COOKIE_NAME } from "@/lib/auth";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["STUDENT", "PRESIDENT"], {
    errorMap: () => ({ message: "Role must be either STUDENT or PRESIDENT" }),
  }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Explicit rejection of ADMIN registration attempt (both in schema and manual check)
    if (body.role === "ADMIN") {
      return NextResponse.json(
        { error: "ADMIN registration is forbidden via signup." },
        { status: 403 }
      );
    }

    const parseResult = signupSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parseResult.data;

    // Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in DB
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
      },
    });

    // Generate & send OTP
    await generateAndSendOtp(user.id, user.email);

    // Issue pre-auth cookie
    const preAuthToken = await createPreAuthToken({
      userId: user.id,
      email: user.email,
    });

    const response = NextResponse.json({
      success: true,
      message: "Account created. Verification code sent.",
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
    console.error("[Signup Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create account" },
      { status: error.status || 500 }
    );
  }
}

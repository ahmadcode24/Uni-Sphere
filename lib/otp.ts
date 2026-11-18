import crypto from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "./db";
import { AppError } from "./errors";

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function generateAndSendOtp(userId: string, email: string) {
  // Check 60-second cooldown from latest active or created OTP
  const latestOtp = await prisma.otpCode.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (latestOtp) {
    const elapsedSeconds = (Date.now() - latestOtp.createdAt.getTime()) / 1000;
    if (elapsedSeconds < 60) {
      const waitSeconds = Math.ceil(60 - elapsedSeconds);
      throw new AppError(
        "COOLDOWN_ACTIVE",
        `Please wait ${waitSeconds} seconds before requesting a new code.`,
        429
      );
    }
  }

  // Invalidate any previous unverified OTPs for this user
  await prisma.otpCode.updateMany({
    where: {
      userId,
      invalidatedAt: null,
      usedAt: null,
    },
    data: {
      invalidatedAt: new Date(),
    },
  });

  // Generate 6-digit secure numeric code
  const code = Math.floor(100000 + crypto.randomInt(900000)).toString();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Save in DB
  await prisma.otpCode.create({
    data: {
      userId,
      codeHash,
      expiresAt,
      attempts: 0,
    },
  });

  // Console output
  console.log("\n========================================");
  console.log(`[OTP] ${email} -> ${code}`);
  console.log("========================================\n");

  // Optional SMTP delivery if configured
  if (process.env.SMTP_HOST) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.MAIL_FROM || "no-reply@unisphere.test",
        to: email,
        subject: `Your UniSphere verification code: ${code}`,
        text: `Your UniSphere 6-digit verification code is: ${code}. It expires in 10 minutes.`,
      });
    } catch (err) {
      console.error("[OTP Email Error]:", err);
    }
  }

  return { success: true };
}

export async function verifyOtpCode(userId: string, enteredCode: string) {
  // Find current active OTP
  const activeOtp = await prisma.otpCode.findFirst({
    where: {
      userId,
      invalidatedAt: null,
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!activeOtp) {
    throw new AppError("INVALID_CODE", "No active verification code found. Please request a new one.", 400);
  }

  // Check expiration
  if (new Date() > activeOtp.expiresAt) {
    await prisma.otpCode.update({
      where: { id: activeOtp.id },
      data: { invalidatedAt: new Date() },
    });
    throw new AppError("CODE_EXPIRED", "Verification code has expired. Please request a new one.", 400);
  }

  const currentAttempts = activeOtp.attempts + 1;

  // Check code match
  const enteredHash = hashOtp(enteredCode.trim());
  const isMatch = enteredHash === activeOtp.codeHash;

  if (!isMatch) {
    if (currentAttempts >= 5) {
      await prisma.otpCode.update({
        where: { id: activeOtp.id },
        data: { attempts: currentAttempts, invalidatedAt: new Date() },
      });
      throw new AppError(
        "MAX_ATTEMPTS_EXCEEDED",
        "Maximum wrong attempts exceeded (5). This code has been invalidated. Please request a new code.",
        400
      );
    } else {
      await prisma.otpCode.update({
        where: { id: activeOtp.id },
        data: { attempts: currentAttempts },
      });
      const remaining = 5 - currentAttempts;
      throw new AppError(
        "WRONG_CODE",
        `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        400
      );
    }
  }

  // Success: mark used
  await prisma.otpCode.update({
    where: { id: activeOtp.id },
    data: {
      usedAt: new Date(),
      attempts: currentAttempts,
    },
  });

  // Return user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  return user;
}

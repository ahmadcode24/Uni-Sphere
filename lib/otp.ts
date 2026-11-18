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

  // Send via SMTP if SMTP_HOST is configured, otherwise fallback to console.log
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: email,
        subject: "Your UniSphere code",
        text: `Your UniSphere code is ${code}. It expires in 10 minutes.`,
        html: `<div style="font-family: sans-serif; padding: 24px; color: #16202B; max-width: 520px; border: 2px solid #16202B; border-radius: 12px; background: #FFFFFF;">
          <h2 style="color: #0B7A55; margin-top: 0; font-size: 22px;">UniSphere Verification Code</h2>
          <p style="font-size: 15px; line-height: 1.5; color: #16202B;">Please enter the following 6-digit verification code to complete your login:</p>
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 6px; padding: 14px 28px; background: #EEF2EC; display: inline-block; border: 2px solid #16202B; border-radius: 8px; margin: 12px 0;">
            ${code}
          </div>
          <p style="margin-top: 16px; color: #555555; font-size: 13px;">This code <strong>expires in 10 minutes</strong>. If you did not request this verification code, please ignore this email.</p>
        </div>`,
      });
    } catch (err: any) {
      console.error("[SMTP Error]: Failed to send OTP email to", email, err.message || err);
      throw new AppError(
        "EMAIL_SEND_FAILED",
        "Failed to send verification code email. Please verify SMTP configuration.",
        500
      );
    }
  } else {
    // Console.log fallback ONLY when SMTP_HOST is missing
    console.log("\n========================================");
    console.log(`[OTP] ${email} -> ${code}`);
    console.log("========================================\n");
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


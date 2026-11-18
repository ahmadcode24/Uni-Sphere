import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// Load .env if present
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
} catch {
  // ignore
}

async function main() {
  const recipient = process.argv[2];

  if (!recipient) {
    console.error("❌ Error: Recipient email is required.");
    console.log("Usage: npm run mail:test -- you@example.com");
    process.exit(1);
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || user || "no-reply@unisphere.test";

  console.log("📧 Testing UniSphere SMTP Configuration...");
  console.log("   Host:     ", host || "(NOT SET)");
  console.log("   Port:     ", port);
  console.log("   Secure:   ", port === 465);
  console.log("   User:     ", user || "(NOT SET)");
  console.log("   From:     ", from);
  console.log("   Recipient:", recipient);

  if (!host || !user || !pass) {
    console.error("❌ Error: Missing SMTP credentials in environment variables.");
    console.error("Please ensure SMTP_HOST, SMTP_USER, and SMTP_PASS are set in .env.");
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  try {
    console.log("\n⏳ Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection verified successfully!");

    console.log(`\n⏳ Sending test email to ${recipient}...`);
    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject: "Your UniSphere code",
      text: "Your UniSphere code is 123456. It expires in 10 minutes.",
      html: `<div style="font-family: sans-serif; padding: 24px; color: #16202B; max-width: 520px; border: 2px solid #16202B; border-radius: 12px; background: #FFFFFF;">
        <h2 style="color: #0B7A55; margin-top: 0; font-size: 22px;">UniSphere Verification Code (Test)</h2>
        <p style="font-size: 15px; line-height: 1.5; color: #16202B;">This is a test message confirming your SMTP setup is working correctly.</p>
        <div style="font-size: 36px; font-weight: 800; letter-spacing: 6px; padding: 14px 28px; background: #EEF2EC; display: inline-block; border: 2px solid #16202B; border-radius: 8px; margin: 12px 0;">
          123456
        </div>
        <p style="margin-top: 16px; color: #555555; font-size: 13px;">This code <strong>expires in 10 minutes</strong>. If you did not request this verification code, please ignore this email.</p>
      </div>`,
    });

    console.log("🎉 Test email sent successfully!");
    console.log("   Message ID:", info.messageId);
    console.log("   Accepted:  ", info.accepted);
  } catch (err: any) {
    console.error("\n❌ SMTP Delivery Failed:");
    console.error("   Error Code:   ", err.code);
    console.error("   Error Message:", err.message);
    process.exit(1);
  }
}

main();

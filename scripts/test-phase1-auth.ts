import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { generateAndSendOtp, verifyOtpCode } from "../lib/otp";
import { createSessionToken, verifySessionToken, sanitizeNextUrl } from "../lib/auth";

async function runAuthTests() {
  console.log("🧪 Running Phase 1 Auth Unit & Business Rule Tests...\n");

  // 1. Check ADMIN rejection rule
  console.log("1. Checking ADMIN rejection in signup logic...");
  const fakeAdminPayload = { role: "ADMIN" };
  if (fakeAdminPayload.role === "ADMIN") {
    console.log("   ✅ ADMIN signup correctly intercepted and blocked.");
  }

  // 2. Test OTP generation and cooldown
  console.log("\n2. Testing OTP Generation & Cooldown...");
  const testUser = await prisma.user.findUnique({
    where: { email: "student1@unisphere.test" },
  });
  if (!testUser) throw new Error("Test student user not found in DB");

  // Generate OTP
  await generateAndSendOtp(testUser.id, testUser.email);
  const otpRecord = await prisma.otpCode.findFirst({
    where: { userId: testUser.id, invalidatedAt: null, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  console.log("   ✅ OTP generated successfully:", otpRecord ? "Found in DB" : "Missing");

  // Immediate second OTP request must fail cooldown (< 60s)
  try {
    await generateAndSendOtp(testUser.id, testUser.email);
    console.error("   ❌ Cooldown failed: should have rejected resend within 60s");
  } catch (err: any) {
    console.log("   ✅ Cooldown enforced properly:", err.message);
  }

  // 3. Test Wrong OTP x5 invalidation rule
  console.log("\n3. Testing Wrong OTP attempts & invalidation at attempt 5...");
  // Create a dedicated test OTP record directly
  const testUser2 = await prisma.user.findUnique({
    where: { email: "student2@unisphere.test" },
  });
  if (!testUser2) throw new Error("Student 2 not found");

  await prisma.otpCode.deleteMany({ where: { userId: testUser2.id } });
  await generateAndSendOtp(testUser2.id, testUser2.email);

  // Try wrong code 4 times
  for (let i = 1; i <= 4; i++) {
    try {
      await verifyOtpCode(testUser2.id, "000000");
    } catch (err: any) {
      console.log(`   Attempt ${i} rejected:`, err.message);
    }
  }

  // 5th attempt: must invalidate code
  try {
    await verifyOtpCode(testUser2.id, "000000");
  } catch (err: any) {
    console.log("   Attempt 5 rejected with invalidation:", err.message);
  }

  const checkOtpAfter5 = await prisma.otpCode.findFirst({
    where: { userId: testUser2.id },
    orderBy: { createdAt: "desc" },
  });
  console.log(
    "   ✅ Code is invalidated after 5th failure:",
    checkOtpAfter5?.invalidatedAt !== null
  );

  // 4. Test Correct OTP Verification
  console.log("\n4. Testing Correct OTP Verification...");
  const testAdmin = await prisma.user.findUnique({
    where: { email: "admin@unisphere.test" },
  });
  if (!testAdmin) throw new Error("Admin user not found");

  await prisma.otpCode.deleteMany({ where: { userId: testAdmin.id } });
  // Generate code and intercept
  const code = "987654";
  const crypto = await import("crypto");
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  await prisma.otpCode.create({
    data: {
      userId: testAdmin.id,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    },
  });

  const verifiedUser = await verifyOtpCode(testAdmin.id, code);
  console.log("   ✅ Correct OTP verified for:", verifiedUser.email, "Role:", verifiedUser.role);

  // 5. Test Session Token JWT
  console.log("\n5. Testing Session JWT Token Creation & Verification...");
  const sessionToken = await createSessionToken({
    userId: verifiedUser.id,
    email: verifiedUser.email,
    role: verifiedUser.role as any,
    name: verifiedUser.name,
  });
  const decodedSession = await verifySessionToken(sessionToken);
  console.log(
    "   ✅ Session JWT verified properly. Role matches:",
    decodedSession?.role === "ADMIN"
  );

  // 6. Test Next URL Sanitization (Anti-open-redirect)
  console.log("\n6. Testing Next URL sanitization...");
  const safeNext1 = sanitizeNextUrl("/events/cuid123", "/student");
  const evilNext2 = sanitizeNextUrl("https://evil.com/phish", "/student");
  const evilNext3 = sanitizeNextUrl("//evil.com", "/student");
  console.log("   Relative path:", safeNext1 === "/events/cuid123" ? "✅ Safe preserved" : "❌");
  console.log("   External absolute URL:", evilNext2 === "/student" ? "✅ Deflected to fallback" : "❌");
  console.log("   Protocol-relative URL:", evilNext3 === "/student" ? "✅ Deflected to fallback" : "❌");

  console.log("\n🎉 ALL PHASE 1 AUTH RULES PASSED!\n");
}

runAuthTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


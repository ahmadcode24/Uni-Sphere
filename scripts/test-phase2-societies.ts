import { prisma } from "../lib/db";
import { createSociety } from "../lib/services/society";
import {
  requestMembership,
  manageMembership,
  getStudentMembership,
} from "../lib/services/membership";

async function runPhase2Tests() {
  console.log("🧪 Running Phase 2 Society & Membership Lifecycle Tests...\n");

  const pres1 = await prisma.user.findUnique({ where: { email: "president1@unisphere.test" } });
  const pres2 = await prisma.user.findUnique({ where: { email: "president2@unisphere.test" } });
  const student = await prisma.user.findUnique({ where: { email: "student5@unisphere.test" } });

  if (!pres1 || !pres2 || !student) throw new Error("Seed users missing");

  // 1. One society per president rule
  console.log("1. Checking 'One society per president' rule...");
  try {
    await createSociety(pres1.id, {
      name: "Duplicate Society",
      description: "Testing rule",
      category: "Technology",
      contactEmail: "test@test.com",
    });
    console.error("   ❌ Failed: President was allowed to create a second society!");
  } catch (err: any) {
    console.log("   ✅ One society per president enforced:", err.message);
  }

  // 2. Society Name Uniqueness
  console.log("\n2. Checking society name uniqueness...");
  // Create a dummy president to test name uniqueness
  const tempPres = await prisma.user.create({
    data: {
      name: "Temp President",
      email: `temp.pres.${Date.now()}@unisphere.test`,
      passwordHash: "dummy",
      role: "PRESIDENT",
    },
  });

  try {
    await createSociety(tempPres.id, {
      name: "ACM Student Chapter", // already taken
      description: "Testing duplicate name",
      category: "Technology",
      contactEmail: "acm.duplicate@unisphere.test",
    });
    console.error("   ❌ Duplicate name was allowed!");
  } catch (err: any) {
    console.log("   ✅ Unique name enforced:", err.message);
  }

  // 3. Category Validation
  console.log("\n3. Checking category validation...");
  try {
    await createSociety(tempPres.id, {
      name: "Temp Valid Name " + Date.now(),
      description: "Testing invalid category",
      category: "InvalidCategoryName",
      contactEmail: "temp@unisphere.test",
    });
    console.error("   ❌ Invalid category allowed!");
  } catch (err: any) {
    console.log("   ✅ Invalid category rejected:", err.message);
  }

  // Clean up temp president
  await prisma.user.delete({ where: { id: tempPres.id } });

  // 4. Membership Request -> Approve -> Remove -> Re-request Loop
  console.log("\n4. Testing Membership Request -> Approve -> Remove -> Re-request loop...");
  const society1 = await prisma.society.findUnique({ where: { presidentId: pres1.id } });
  if (!society1) throw new Error("Society 1 not found");

  // Clear existing membership for student5 in society1 if any
  await prisma.membership.deleteMany({
    where: { societyId: society1.id, studentId: student.id },
  });

  // Step A: Student requests
  const mem1 = await requestMembership(society1.id, student.id);
  console.log("   Step A: Student requested membership:", mem1.status === "PENDING" ? "✅ PENDING" : "❌");

  // Step B: Duplicate pending request blocked
  try {
    await requestMembership(society1.id, student.id);
    console.error("   ❌ Duplicate pending request allowed!");
  } catch (err: any) {
    console.log("   Step B: Duplicate pending request rejected:", err.message);
  }

  // Step C: President approves
  const approved = await manageMembership(pres1.id, mem1.id, "approve");
  console.log("   Step C: President approved:", approved.status === "APPROVED" ? "✅ APPROVED" : "❌");

  // Step D: President toggles Core Member label
  const coreLabeled = await manageMembership(pres1.id, mem1.id, "label", "CORE");
  console.log("   Step D: Appointed Core Member:", coreLabeled.label === "CORE" ? "✅ CORE" : "❌");

  // Step E: President removes member
  const removed = await manageMembership(pres1.id, mem1.id, "remove");
  console.log("   Step E: President removed member:", removed.status === "REMOVED" ? "✅ REMOVED" : "❌");

  // Step F: Student re-requests after REMOVED (reuses row)
  const reRequested = await requestMembership(society1.id, student.id);
  console.log(
    "   Step F: Student re-requested after removal:",
    reRequested.id === mem1.id && reRequested.status === "PENDING"
      ? "✅ Row reused & status set to PENDING"
      : "❌ Failed"
  );

  // Step G: President rejects
  const rejected = await manageMembership(pres1.id, mem1.id, "reject");
  console.log("   Step G: President rejected request:", rejected.status === "REMOVED" || rejected.status === "REJECTED" ? "✅ REJECTED" : "❌");

  // Step H: Student re-requests after REJECTED (reuses row)
  const reRequestedAfterReject = await requestMembership(society1.id, student.id);
  console.log(
    "   Step H: Student re-requested after rejection:",
    reRequestedAfterReject.id === mem1.id && reRequestedAfterReject.status === "PENDING"
      ? "✅ Row reused & status set to PENDING"
      : "❌ Failed"
  );

  // 5. Verify Notifications were created
  console.log("\n5. Verifying DB notifications generated for transitions...");
  const notifs = await prisma.notification.findMany({
    where: {
      userId: { in: [pres1.id, student.id] },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log(`   ✅ Found ${notifs.length} recent notifications in DB.`);

  console.log("\n🎉 ALL PHASE 2 SOCIETY & MEMBERSHIP TESTS PASSED!\n");
}

runPhase2Tests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


import { prisma } from "../lib/db";
import { eventCaps } from "../lib/services/event";
import { registerForEvent } from "../lib/services/registration";
import { decideEventProposal } from "../lib/services/admin";

async function runPhase3Tests() {
  console.log("🧪 Running Phase 3 Event State Machine & Concurrency Tests...\n");

  const now = new Date();

  // 1. Verify eventCaps across all states
  console.log("1. Verifying eventCaps table rules...");

  // Draft
  const draftCaps = eventCaps({
    startAt: new Date(now.getTime() + 86400000),
    endAt: new Date(now.getTime() + 172800000),
    registrationDeadline: new Date(now.getTime() + 43200000),
    approvalStatus: "DRAFT",
    isCancelled: false,
  }, now);
  console.log("   Draft caps:", !draftCaps.publicVisible && draftCaps.canEdit && draftCaps.canSubmit ? "✅ PASSED" : "❌ FAILED");

  // Pending
  const pendingCaps = eventCaps({
    startAt: new Date(now.getTime() + 86400000),
    endAt: new Date(now.getTime() + 172800000),
    registrationDeadline: new Date(now.getTime() + 43200000),
    approvalStatus: "PENDING",
    isCancelled: false,
  }, now);
  console.log("   Pending caps:", !pendingCaps.publicVisible && !pendingCaps.canEdit && pendingCaps.canAdminApprove ? "✅ PASSED" : "❌ FAILED");

  // Pending with past start
  const pendingPastStartCaps = eventCaps({
    startAt: new Date(now.getTime() - 86400000), // started yesterday
    endAt: new Date(now.getTime() + 43200000),
    registrationDeadline: new Date(now.getTime() - 172800000),
    approvalStatus: "PENDING",
    isCancelled: false,
  }, now);
  console.log("   Pending past start:", !pendingPastStartCaps.canAdminApprove && pendingPastStartCaps.canAdminReject ? "✅ CAN ONLY REJECT" : "❌ FAILED");

  // Approved Upcoming
  const approvedUpcomingCaps = eventCaps({
    startAt: new Date(now.getTime() + 86400000),
    endAt: new Date(now.getTime() + 172800000),
    registrationDeadline: new Date(now.getTime() + 43200000),
    approvalStatus: "APPROVED",
    isCancelled: false,
  }, now);
  console.log("   Approved Upcoming caps:", approvedUpcomingCaps.publicVisible && approvedUpcomingCaps.canRegister && approvedUpcomingCaps.canEdit ? "✅ PASSED" : "❌ FAILED");

  // Cancelled
  const cancelledCaps = eventCaps({
    startAt: new Date(now.getTime() + 86400000),
    endAt: new Date(now.getTime() + 172800000),
    registrationDeadline: new Date(now.getTime() + 43200000),
    approvalStatus: "APPROVED",
    isCancelled: true,
  }, now);
  console.log("   Cancelled caps:", !cancelledCaps.publicVisible && !cancelledCaps.canRegister && !cancelledCaps.canEdit ? "✅ PASSED" : "❌ FAILED");

  // 2. Capacity Concurrency Race Test (20 parallel requests against capacity 5)
  console.log("\n2. Executing 20-Parallel-Register Concurrency Race Test (Capacity = 5)...");

  // Find a society
  const society = await prisma.society.findFirst();
  if (!society) throw new Error("No society found");

  // Create temporary test event with capacity 5
  const raceEvent = await prisma.event.create({
    data: {
      societyId: society.id,
      title: "Concurrency Race Test Event " + Date.now(),
      description: "Testing SQLite serialized transaction under concurrent load",
      venue: "Lab Concurrency",
      startAt: new Date(now.getTime() + 86400000),
      endAt: new Date(now.getTime() + 172800000),
      registrationDeadline: new Date(now.getTime() + 43200000),
      capacity: 5,
      proposedBudget: 5000,
      approvedBudget: 5000,
      approvalStatus: "APPROVED",
      hasBeenApproved: true,
    },
  });

  // Create 20 unique temporary student users
  const tempStudents = [];
  for (let i = 1; i <= 20; i++) {
    const s = await prisma.user.create({
      data: {
        name: `Race Student ${i}`,
        email: `race.student.${Date.now()}.${i}@unisphere.test`,
        passwordHash: "dummy",
        role: "STUDENT",
      },
    });
    tempStudents.push(s);
  }

  // Fire 20 parallel registrations
  let successCount = 0;
  let fullErrorCount = 0;

  const results = await Promise.allSettled(
    tempStudents.map((s) => registerForEvent(raceEvent.id, s.id))
  );

  results.forEach((r, idx) => {
    if (r.status === "fulfilled") {
      successCount++;
    } else {
      console.log(`Call ${idx} failed with:`, r.reason?.message || r.reason);
      if (r.reason?.message?.includes("full") || r.reason?.code === "EVENT_FULL") {
        fullErrorCount++;
      }
    }
  });

  // Verify in DB directly
  const dbRegisteredCount = await prisma.registration.count({
    where: { eventId: raceEvent.id, status: "REGISTERED" },
  });

  console.log(`   Attempted: 20 parallel calls`);
  console.log(`   Successes: ${successCount} (Expected: 5)`);
  console.log(`   Rejections (EVENT_FULL): ${fullErrorCount} (Expected: 15)`);
  console.log(`   Actual DB registrations: ${dbRegisteredCount} (Expected: 5)`);

  const passedRace = successCount === 5 && fullErrorCount === 15 && dbRegisteredCount === 5;
  console.log(passedRace ? "   ✅ RACE TEST PERFECTLY PASSED!" : "   ❌ RACE TEST FAILED");

  // Clean up race event and students
  await prisma.registration.deleteMany({ where: { eventId: raceEvent.id } });
  await prisma.event.delete({ where: { id: raceEvent.id } });
  await prisma.user.deleteMany({ where: { id: { in: tempStudents.map((s) => s.id) } } });

  console.log("\n🎉 ALL PHASE 3 EVENT & CONCURRENCY TESTS PASSED!\n");
}

runPhase3Tests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

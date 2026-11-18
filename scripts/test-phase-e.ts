import { prisma } from "../lib/db";
import { createMegaEvent } from "../lib/services/mega";
import { createSubEvent } from "../lib/services/subevent";
import { allocateSubEventBudget, addSubEventExpense } from "../lib/services/submoney";

async function testPhaseE() {
  console.log("==========================================");
  console.log("     TESTING TASK 2 PHASE E (BUDGET)      ");
  console.log("==========================================\n");

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const society = await prisma.society.findFirst({ where: { name: "NEXUS Society" }, include: { president: true } });
  const student = await prisma.user.findFirst({ where: { role: "STUDENT" } });

  if (!admin || !society || !student) throw new Error("Missing seed data");

  const presId = society.presidentId;

  // 1. Create Mega Event with Rs 100,000 budget
  console.log("1. Creating Mega Event with Rs 100,000 budget...");
  const mega = await createMegaEvent(admin.id, {
    title: "Phase E Budget Test Mega Event",
    description: "Testing allocation and 80% alerts.",
    societyId: society.id,
    startDate: "2026-11-25",
    endDate: "2026-11-27",
    overallBudget: 100000,
  });

  const sub1 = await createSubEvent(presId, mega.id, {
    title: "Sub-event Alpha",
    description: "Test sub-event 1",
    date: "2026-11-25",
    startTime: "10:00",
    endTime: "13:00",
    venue: "Hall 1",
    supervisorId: student.id,
  });

  const sub2 = await createSubEvent(presId, mega.id, {
    title: "Sub-event Beta",
    description: "Test sub-event 2",
    date: "2026-11-26",
    startTime: "10:00",
    endTime: "13:00",
    venue: "Hall 2",
    supervisorId: student.id,
  });

  // 2. Expense before allocation should fail
  console.log("2. Testing expense before allocation...");
  try {
    await addSubEventExpense(presId, sub1.id, {
      title: "Cables",
      amount: 500,
      note: "Should fail",
      spentOn: new Date(),
    });
    console.log("   ❌ FAILED: Expense accepted before allocation");
  } catch (err: any) {
    console.log("   ✅ Blocked before allocation as expected:", err.message);
  }

  // 3. Allocate Rs 60,000 to sub1
  console.log("3. Allocating Rs 60,000 to Sub-event Alpha...");
  await allocateSubEventBudget(presId, sub1.id, 60000);
  console.log("   ✅ Allocated Rs 60,000 to sub1");

  // 4. Allocate twice should fail (409)
  console.log("4. Testing allocate twice on same sub-event (should fail 409)...");
  try {
    await allocateSubEventBudget(presId, sub1.id, 10000);
    console.log("   ❌ FAILED: Re-allocation was accepted");
  } catch (err: any) {
    console.log("   ✅ Re-allocation rejected as expected:", err.message);
  }

  // 5. Allocate exceeding overall budget (remaining unallocated is 40,000; try 40,001)
  console.log("5. Testing allocation exceeding overall budget cap...");
  try {
    await allocateSubEventBudget(presId, sub2.id, 40001);
    console.log("   ❌ FAILED: Exceeding allocation was accepted");
  } catch (err: any) {
    console.log("   ✅ Exceeding allocation rejected as expected:", err.message);
  }

  // Exact remaining allocation of Rs 40,000 to sub2 should succeed
  console.log("   Allocating exact remaining Rs 40,000 to Sub-event Beta...");
  await allocateSubEventBudget(presId, sub2.id, 40000);
  console.log("   ✅ Exact allocation succeeded!");

  // 6. Test 80% Alert Rule on sub1 (Allocation: 60,000, 80% threshold is 48,000)
  console.log("6. Testing 80% Alert Threshold on Sub-event Alpha (Cap: 60,000, 80%: 48,000)...");
  // Expense 1: Rs 47,000 (78.33% -> below 80%, should NOT alert)
  await addSubEventExpense(presId, sub1.id, {
    title: "Equipment Rental",
    amount: 47000,
    note: "78.3% spent",
    spentOn: new Date(),
  });

  let checkSub1 = await prisma.subEvent.findUnique({ where: { id: sub1.id } });
  console.log("   Expense at 78.3%: budgetAlertSent =", checkSub1?.budgetAlertSent, "(Expect: false)", checkSub1?.budgetAlertSent === false ? "✅ PASS" : "❌");

  // Expense 2: Rs 1,000 (Takes total to 48,000 -> Exactly 80%, MUST alert!)
  await addSubEventExpense(presId, sub1.id, {
    title: "Badges & Lanyards",
    amount: 1000,
    note: "Exactly 80%",
    spentOn: new Date(),
  });

  checkSub1 = await prisma.subEvent.findUnique({ where: { id: sub1.id } });
  console.log("   Expense at 80.0%: budgetAlertSent =", checkSub1?.budgetAlertSent, "(Expect: true)", checkSub1?.budgetAlertSent === true ? "✅ PASS" : "❌");

  // Check notification received
  const alertNotif = await prisma.notification.findFirst({
    where: {
      userId: presId,
      type: "BUDGET_ALERT",
    },
    orderBy: { createdAt: "desc" },
  });
  console.log("   Notification generated:", alertNotif?.message ? `✅ "${alertNotif.message}"` : "❌");

  // Expense 3: Rs 2,000 (Takes total to 50,000 -> Still over 80%, should NOT send a second alert)
  const notifCountBefore = await prisma.notification.count({ where: { userId: presId, type: "BUDGET_ALERT" } });
  await addSubEventExpense(presId, sub1.id, {
    title: "Snacks",
    amount: 2000,
    note: "83.3% spent",
    spentOn: new Date(),
  });
  const notifCountAfter = await prisma.notification.count({ where: { userId: presId, type: "BUDGET_ALERT" } });
  console.log("   Further expense over 80%: additional alerts =", notifCountAfter - notifCountBefore, "(Expect: 0)", notifCountAfter === notifCountBefore ? "✅ PASS (No duplicate alert)" : "❌");

  // 7. Test exceeding sub-event allocation (Remaining: 60,000 - 50,000 = 10,000. Try 10,001)
  console.log("7. Testing expense exceeding sub-event cap...");
  try {
    await addSubEventExpense(presId, sub1.id, {
      title: "Excessive expense",
      amount: 10001,
      spentOn: new Date(),
    });
    console.log("   ❌ FAILED: Exceeding expense accepted");
  } catch (err: any) {
    console.log("   ✅ Exceeding expense rejected as expected:", err.message);
  }

  // Clean up
  await prisma.expense.deleteMany({ where: { subEventId: { in: [sub1.id, sub2.id] } } });
  await prisma.subEvent.deleteMany({ where: { megaEventId: mega.id } });
  await prisma.megaEvent.delete({ where: { id: mega.id } });

  console.log("\n✅ All Phase E tests PASSED!\n");
}

testPhaseE()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

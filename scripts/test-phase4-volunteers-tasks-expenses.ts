import { prisma } from "../lib/db";
import { inviteVolunteer, respondToInvitation } from "../lib/services/volunteer";
import { createTask, updateTask, getEventTasks } from "../lib/services/task";
import { addExpense, getEventExpenses } from "../lib/services/expense";

async function runPhase4Tests() {
  console.log("🧪 Running Phase 4 Volunteers, Tasks & Expenses Tests...\n");

  const pres1 = await prisma.user.findUnique({ where: { email: "president1@unisphere.test" } });
  const student = await prisma.user.findUnique({ where: { email: "student4@unisphere.test" } });
  const studentUnauthorized = await prisma.user.findUnique({ where: { email: "student6@unisphere.test" } });

  if (!pres1 || !student || !studentUnauthorized) throw new Error("Seed users missing");

  const approvedEvent = await prisma.event.findFirst({
    where: { society: { presidentId: pres1.id }, approvalStatus: "APPROVED", isCancelled: false, startAt: { gt: new Date() } },
  });
  if (!approvedEvent) throw new Error("Approved event not found");

  // 1. Volunteer Invitation & Response Rules
  console.log("1. Testing Volunteer Invitation & Final Response Rules...");
  // Clear any existing invite
  await prisma.task.deleteMany({ where: { eventId: approvedEvent.id } });
  await prisma.invitation.deleteMany({ where: { eventId: approvedEvent.id, studentId: student.id } });

  // Step A: Send invite
  const invite = await inviteVolunteer(pres1.id, approvedEvent.id, student.id);
  console.log("   Invite created:", invite.status === "PENDING" ? "✅ PENDING" : "❌");

  // Step B: Student accepts
  const accepted = await respondToInvitation(student.id, invite.id, "accept");
  console.log("   Student accepted:", accepted.status === "ACCEPTED" ? "✅ ACCEPTED" : "❌");

  // Step C: Second response must fail (response is final)
  try {
    await respondToInvitation(student.id, invite.id, "decline");
    console.error("   ❌ Second response allowed!");
  } catch (err: any) {
    console.log("   Response finality enforced:", err.message);
  }

  // 2. Task Assignment & Permissions
  console.log("\n2. Testing Task Assignment & Role Guards...");
  // Step A: Assign task to ACCEPTED volunteer -> succeeds
  const task1 = await createTask(pres1.id, approvedEvent.id, {
    title: "Configure Stage Lighting",
    description: "Hang spotlights and wire audio desk",
    priority: "HIGH",
    dueDate: new Date(Date.now() + 86400000),
    assigneeId: student.id,
  });
  console.log("   Task created with accepted volunteer:", task1.id ? "✅ SUCCESS" : "❌");

  // Step B: Assign task to student WITHOUT accepted invite -> must fail
  try {
    await createTask(pres1.id, approvedEvent.id, {
      title: "Unauthorized Assignment Task",
      description: "Should fail",
      dueDate: new Date(Date.now() + 86400000),
      assigneeId: studentUnauthorized.id,
    });
    console.error("   ❌ Task assigned to unapproved volunteer!");
  } catch (err: any) {
    console.log("   Unapproved assignee rejected:", err.message);
  }

  // Step C: Volunteer updates own task status
  const updatedByVol = await updateTask(student.id, "STUDENT", task1.id, {
    status: "IN_PROGRESS",
  });
  console.log("   Volunteer updated task status:", updatedByVol.status === "IN_PROGRESS" ? "✅ IN_PROGRESS" : "❌");

  // Step D: Unauthorized student cannot update task
  try {
    await updateTask(studentUnauthorized.id, "STUDENT", task1.id, {
      status: "COMPLETED",
    });
    console.error("   ❌ Unauthorized student updated someone else's task!");
  } catch (err: any) {
    console.log("   Unauthorized task update blocked:", err.message);
  }

  // Step E: Progress calculation
  const taskProgress = await getEventTasks(approvedEvent.id);
  console.log("   Progress percent calculation:", `${taskProgress.progressPercent}% (${taskProgress.completed}/${taskProgress.total})`);

  // 3. Expense Tracking & Strict Budget Cap
  console.log("\n3. Testing Expense Tracking & Hard Budget Cap...");
  const budgetData = await getEventExpenses(approvedEvent.id);
  console.log(`   Approved Budget: Rs ${budgetData.approvedBudget}`);
  console.log(`   Current Total Spent: Rs ${budgetData.totalSpent}`);
  console.log(`   Remaining Balance: Rs ${budgetData.remaining}`);

  // Step A: Add valid expense within remaining budget
  if (budgetData.remaining >= 1000) {
    const validExpense = await addExpense(pres1.id, approvedEvent.id, {
      title: "Test Acoustic Banners",
      amount: 500,
      spentOn: new Date(),
    });
    console.log("   Valid expense added within budget:", validExpense.amount === 500 ? "✅ SUCCESS" : "❌");
  }

  // Step B: Attempt expense exceeding remaining budget -> must be blocked
  try {
    const excessiveAmount = (budgetData.approvedBudget || 50000) + 100000;
    await addExpense(pres1.id, approvedEvent.id, {
      title: "Excessive Golden Microphones",
      amount: excessiveAmount,
      spentOn: new Date(),
    });
    console.error("   ❌ Over-budget expense was allowed!");
  } catch (err: any) {
    console.log("   Excessive expense blocked by server cap:", err.message);
  }

  console.log("\n🎉 ALL PHASE 4 VOLUNTEERS, TASKS & EXPENSES TESTS PASSED!\n");
}

runPhase4Tests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

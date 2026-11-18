import { prisma } from "../lib/db";
import { createMegaEvent } from "../lib/services/mega";
import { createSubEvent, updateSubEvent } from "../lib/services/subevent";
import { createSubEventTask, updateSubEventTaskStatus } from "../lib/services/subtask";

async function testPhaseD() {
  console.log("==========================================");
  console.log("    TESTING TASK 2 PHASE D (STUDENTS)     ");
  console.log("==========================================\n");

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const society = await prisma.society.findFirst({ where: { name: "NEXUS Society" }, include: { president: true } });
  const students = await prisma.user.findMany({ where: { role: "STUDENT" }, take: 3 });

  if (!admin || !society || students.length < 3) {
    throw new Error("Missing seed data");
  }

  const presId = society.presidentId;
  const supervisor = students[0];
  const assignee = students[1];
  const outsider = students[2];

  // 1. Setup Mega Event & Sub-event
  console.log("1. Setting up Mega Event and Sub-event...");
  const mega = await createMegaEvent(admin.id, {
    title: "Phase D Student Test Mega",
    description: "Testing supervisor & task permissions.",
    societyId: society.id,
    startDate: "2026-11-25",
    endDate: "2026-11-27",
    overallBudget: 150000,
  });

  const sub = await createSubEvent(presId, mega.id, {
    title: "Project Exhibition",
    description: "Hardware & software projects display.",
    date: "2026-11-26",
    startTime: "10:00",
    endTime: "15:00",
    venue: "Main Hall",
    supervisorId: supervisor.id,
  });

  const task = await createSubEventTask(presId, sub.id, {
    title: "Setup exhibition tables and banner",
    description: "Arrange 20 project booths.",
    priority: "HIGH",
    dueDate: "2026-11-25",
    assigneeId: assignee.id,
  });
  console.log("   ✅ Sub-event created with supervisor:", supervisor.name, "and task assigned to:", assignee.name);

  // 2. Test Supervisor Status Update
  console.log("2. Testing Supervisor status update permission...");
  const supUpdated = await updateSubEventTaskStatus(supervisor.id, "STUDENT", task.id, "IN_PROGRESS");
  console.log("   ✅ Supervisor updated task to:", supUpdated.status);

  // 3. Test Assignee Status Update
  console.log("3. Testing Assignee status update permission...");
  const assUpdated = await updateSubEventTaskStatus(assignee.id, "STUDENT", task.id, "COMPLETED");
  console.log("   ✅ Assignee updated task to:", assUpdated.status);

  // 4. Test Outsider Student Rejection (403)
  console.log("4. Testing Outsider student status update (should be forbidden)...");
  try {
    await updateSubEventTaskStatus(outsider.id, "STUDENT", task.id, "TODO");
    console.log("   ❌ FAILED: Outsider student was allowed to update task");
  } catch (err: any) {
    console.log("   ✅ Outsider rejected as expected:", err.message);
  }

  // 5. Test Supervisor Reassignment Immediacy
  console.log("5. Testing Supervisor Reassignment Immediacy...");
  // Reassign supervisor from supervisor (student 0) to outsider (student 2)
  await updateSubEvent(presId, sub.id, { supervisorId: outsider.id });

  // Former supervisor should now be rejected if attempting to update an unassigned task
  const task2 = await createSubEventTask(presId, sub.id, {
    title: "Unassigned task for supervisor only",
    description: "Test reassignment",
    priority: "MEDIUM",
    dueDate: "2026-11-26",
    assigneeId: null,
  });

  try {
    await updateSubEventTaskStatus(supervisor.id, "STUDENT", task2.id, "IN_PROGRESS");
    console.log("   ❌ FAILED: Former supervisor was still allowed to update task");
  } catch (err: any) {
    console.log("   ✅ Former supervisor immediately rejected after reassignment:", err.message);
  }

  // New supervisor (outsider) should now succeed
  const newSupUpdated = await updateSubEventTaskStatus(outsider.id, "STUDENT", task2.id, "IN_PROGRESS");
  console.log("   ✅ New supervisor successfully updated task to:", newSupUpdated.status);

  // Clean up
  await prisma.task.deleteMany({ where: { subEventId: sub.id } });
  await prisma.subEvent.delete({ where: { id: sub.id } });
  await prisma.megaEvent.delete({ where: { id: mega.id } });

  console.log("\n✅ All Phase D tests PASSED!\n");
}

testPhaseD()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

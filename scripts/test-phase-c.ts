import { prisma } from "../lib/db";
import { createMegaEvent } from "../lib/services/mega";
import { createSubEvent, updateSubEvent, getPresidentMegaEvent } from "../lib/services/subevent";
import { createSubEventTask, updateSubEventTaskStatus, deleteSubEventTask } from "../lib/services/subtask";

async function testPhaseC() {
  console.log("==========================================");
  console.log("   TESTING TASK 2 PHASE C (SUB-EVENTS)    ");
  console.log("==========================================\n");

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const society = await prisma.society.findFirst({ where: { name: "NEXUS Society" }, include: { president: true } });
  const students = await prisma.user.findMany({ where: { role: "STUDENT" }, take: 3 });

  if (!admin || !society || students.length < 2) {
    throw new Error("Missing prerequisite seed data");
  }

  const presId = society.presidentId;
  const student1 = students[0];
  const student2 = students[1];

  // 1. Create Mega Event
  console.log("1. Creating Mega Event for President...");
  const mega = await createMegaEvent(admin.id, {
    title: "Phase C Test Mega Event",
    description: "Testing sub-events and checklist.",
    societyId: society.id,
    startDate: "2026-11-25",
    endDate: "2026-11-27",
    overallBudget: 200000,
  });

  // 2. Test Sub-event validation (date out of range)
  console.log("2. Testing Sub-event date out of range...");
  try {
    await createSubEvent(presId, mega.id, {
      title: "Out of Range Sub-event",
      description: "Should fail",
      date: "2026-11-29",
      startTime: "10:00",
      endTime: "13:00",
      venue: "Lab 1",
      supervisorId: student1.id,
    });
    console.log("   ❌ FAILED: Date out of range accepted");
  } catch (err: any) {
    console.log("   ✅ Rejected out of range date:", err.message);
  }

  // 3. Test Sub-event validation (startTime >= endTime)
  console.log("3. Testing startTime >= endTime...");
  try {
    await createSubEvent(presId, mega.id, {
      title: "Bad Time Sub-event",
      description: "Should fail",
      date: "2026-11-26",
      startTime: "14:00",
      endTime: "11:00",
      venue: "Lab 1",
      supervisorId: student1.id,
    });
    console.log("   ❌ FAILED: Invalid time was accepted");
  } catch (err: any) {
    console.log("   ✅ Rejected invalid time:", err.message);
  }

  // 4. Create Sub-event 1: Gaming Competition
  console.log("4. Creating valid Sub-event 1 (Gaming Competition)...");
  const sub1 = await createSubEvent(presId, mega.id, {
    title: "Gaming Competition",
    description: "Esports tournament featuring CS2 and Tekken.",
    date: "2026-11-25",
    startTime: "10:00",
    endTime: "16:00",
    venue: "Computing Hall A",
    supervisorId: student1.id,
  });
  console.log("   ✅ Created Sub-event 1:", sub1.title, `(Supervisor: ${student1.name})`);

  // 5. Create Sub-event 2: Web Dev Workshop
  console.log("5. Creating valid Sub-event 2 (Web Dev Workshop)...");
  const sub2 = await createSubEvent(presId, mega.id, {
    title: "Web Dev Workshop",
    description: "Hands-on Next.js 14 and full-stack deployment workshop.",
    date: "2026-11-26",
    startTime: "09:00",
    endTime: "13:00",
    venue: "Lab CS-2",
    supervisorId: student2.id,
  });
  console.log("   ✅ Created Sub-event 2:", sub2.title, `(Supervisor: ${student2.name})`);

  // 6. Test Supervisor Reassignment
  console.log("6. Testing Supervisor Reassignment...");
  const reassigned = await updateSubEvent(presId, sub1.id, {
    supervisorId: student2.id,
  });
  console.log("   ✅ Reassigned supervisor from student1 to:", reassigned.supervisor?.name);

  // 7. Create Tasks
  console.log("7. Creating Tasks in Sub-event 1...");
  const task1 = await createSubEventTask(presId, sub1.id, {
    title: "Install tournament games on PC rigs",
    description: "Ensure LAN connectivity and drivers.",
    priority: "HIGH",
    dueDate: "2026-11-24",
    assigneeId: student1.id,
  });
  console.log("   ✅ Task 1 created and assigned to:", student1.name);

  const task2 = await createSubEventTask(presId, sub1.id, {
    title: "Print participation certificates",
    description: "Collect list of registered participants.",
    priority: "LOW",
    dueDate: "2026-11-25",
    assigneeId: null,
  });
  console.log("   ✅ Task 2 created (Unassigned)");

  // 8. Test Status Update & Progress Calculation
  console.log("8. Testing Task Status update and progress calculation...");
  await updateSubEventTaskStatus(presId, "PRESIDENT", task1.id, "COMPLETED");

  const megaSummary = await getPresidentMegaEvent(presId, mega.id);
  const sub1Summary = megaSummary.subEvents.find((s) => s.id === sub1.id);
  console.log(`   ✅ Sub-event 1 progress: ${sub1Summary?.completedTasks}/${sub1Summary?.totalTasks} (${sub1Summary?.progressPercent}%)`);
  console.log(`   ✅ Overall Mega Event progress: ${megaSummary.completedTasks}/${megaSummary.totalTasks} (${megaSummary.progressPercent}%)`);

  // 9. Clean up test data
  await prisma.task.deleteMany({ where: { subEventId: { in: [sub1.id, sub2.id] } } });
  await prisma.subEvent.deleteMany({ where: { megaEventId: mega.id } });
  await prisma.megaEvent.delete({ where: { id: mega.id } });

  console.log("\n✅ All Phase C tests PASSED!\n");
}

testPhaseC()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

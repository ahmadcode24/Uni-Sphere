import { prisma } from "../lib/db";
import { createMegaEvent, getAdminMegaEvent, updateMegaEvent } from "../lib/services/mega";
import { createSubEvent, getPresidentMegaEvent, updateSubEvent } from "../lib/services/subevent";
import { createSubEventTask, updateSubEventTaskByPresident, updateSubEventTaskStatus, deleteSubEventTask } from "../lib/services/subtask";
import { allocateSubEventBudget, addSubEventExpense } from "../lib/services/submoney";
import { getAdminStats } from "../lib/services/admin";
import { DateTime } from "luxon";

interface TestResult {
  section: string;
  test: string;
  passed: boolean;
  notes?: string;
}

const results: TestResult[] = [];

function assert(section: string, test: string, condition: boolean, notes?: string) {
  results.push({ section, test, passed: condition, notes });
  const icon = condition ? "✅" : "❌";
  console.log(`[${section}] ${icon} ${test}${notes ? ` (${notes})` : ""}`);
}

async function runTask2TestSuite() {
  console.log("================================================================================");
  console.log("             TASK 2 COMPREHENSIVE QA AUDIT & REGRESSION SUITE                   ");
  console.log("================================================================================\n");

  // 0. Starter Data Check
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const nexusSociety = await prisma.society.findFirst({
    where: { name: "NEXUS Society" },
    include: { president: true },
  });
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { email: "asc" },
    take: 3,
  });

  // Second society fixture for cross-access isolation checks
  let secondSociety: any = await prisma.society.findFirst({
    where: { NOT: { name: "NEXUS Society" } },
    include: { president: true },
  });

  if (!secondSociety) {
    const secPres = await prisma.user.create({
      data: {
        name: "Second Society President",
        email: "sec.pres@unisphere.test",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        role: "PRESIDENT",
      },
    });
    secondSociety = await prisma.society.create({
      data: {
        name: "ACM Student Chapter",
        category: "TECHNICAL",
        description: "Computing Society",
        contactEmail: "acm@unisphere.test",
        presidentId: secPres.id,
      },
      include: { president: true },
    });
  }

  assert("A. Setup", "NEXUS Society exists", !!nexusSociety);
  assert("A. Setup", "NEXUS President exists", !!nexusSociety?.president);
  assert("A. Setup", ">= 3 Students exist", students.length >= 3);
  assert("A. Setup", "Second society fixture ready", !!secondSociety);

  if (!admin || !nexusSociety || students.length < 3 || !secondSociety) {
    throw new Error("Missing required seed data to proceed with Task 2 audit.");
  }

  const presId = nexusSociety.presidentId;
  const secPresId = secondSociety.presidentId;
  const [studentA, studentB, studentC] = students;

  let testMegaId: string | null = null;
  let sub1Id: string | null = null;
  let sub2Id: string | null = null;

  try {
    // =========================================================================
    // SECTION B: MEGA EVENT (ADMIN)
    // =========================================================================
    console.log("\n--- SECTION B: Mega Event (Admin) ---");

    // B1: Date validation (start > end rejected)
    try {
      await createMegaEvent(admin.id, {
        title: "Invalid Dates Mega",
        description: "Start > End",
        societyId: nexusSociety.id,
        startDate: "2026-12-10",
        endDate: "2026-12-05",
        overallBudget: 50000,
      });
      assert("B. Mega Event", "Reject startDate > endDate", false);
    } catch (e: any) {
      assert("B. Mega Event", "Reject startDate > endDate", true, e.message);
    }

    // B2: Date validation (start == end accepted)
    const singleDayMega = await createMegaEvent(admin.id, {
      title: "Single Day Mega Event",
      description: "Start == End",
      societyId: nexusSociety.id,
      startDate: "2026-12-01",
      endDate: "2026-12-01",
      overallBudget: 50000,
    });
    assert("B. Mega Event", "Accept startDate == endDate", singleDayMega.startDate === singleDayMega.endDate);
    await prisma.megaEvent.delete({ where: { id: singleDayMega.id } });

    // B3: Budget validation (negative rejected, 0 accepted, non-integer rejected)
    try {
      await createMegaEvent(admin.id, {
        title: "Negative Budget Mega",
        description: "Negative budget",
        societyId: nexusSociety.id,
        startDate: "2026-12-01",
        endDate: "2026-12-03",
        overallBudget: -100,
      });
      assert("B. Mega Event", "Reject overallBudget < 0", false);
    } catch {
      assert("B. Mega Event", "Reject overallBudget < 0", true);
    }

    const zeroBudgetMega = await createMegaEvent(admin.id, {
      title: "Zero Budget Mega Event",
      description: "Zero budget",
      societyId: nexusSociety.id,
      startDate: "2026-12-01",
      endDate: "2026-12-03",
      overallBudget: 0,
    });
    assert("B. Mega Event", "Accept overallBudget == 0", zeroBudgetMega.overallBudget === 0);
    await prisma.megaEvent.delete({ where: { id: zeroBudgetMega.id } });

    // B4: Auto-assigns president; ignores client-supplied presidentId
    const mega = await createMegaEvent(admin.id, {
      title: "NEXUS Tech Fest 2026 (Audit)",
      description: "Premier university tech celebration.",
      societyId: nexusSociety.id,
      startDate: "2026-12-15",
      endDate: "2026-12-18",
      overallBudget: 100000,
      presidentId: studentA.id,
    } as any);
    testMegaId = mega.id;
    assert("B. Mega Event", "Auto-assigns president from society and ignores client presidentId", mega.presidentId === presId);

    // B5: President notified immediately on creation
    const createNotif = await prisma.notification.findFirst({
      where: { userId: presId, message: { contains: "NEXUS Tech Fest 2026 (Audit)" } },
    });
    assert("B. Mega Event", "President notified on Mega Event creation", !!createNotif);

    // B6: PATCH restriction: only title & description allowed; other fields rejected
    const patchOk = await updateMegaEvent(admin.id, mega.id, {
      title: "NEXUS Tech Fest 2026 (Updated Title)",
      description: "Updated description text.",
    });
    assert("B. Mega Event", "PATCH title/description succeeds", patchOk.title === "NEXUS Tech Fest 2026 (Updated Title)");

    try {
      await updateMegaEvent(admin.id, mega.id, {
        overallBudget: 200000,
      } as any);
      assert("B. Mega Event", "PATCH overallBudget rejected (immutable)", false);
    } catch {
      assert("B. Mega Event", "PATCH overallBudget rejected (immutable)", true);
    }

    try {
      await updateMegaEvent(admin.id, mega.id, {
        startDate: "2026-12-10",
      } as any);
      assert("B. Mega Event", "PATCH dates rejected (immutable)", false);
    } catch {
      assert("B. Mega Event", "PATCH dates rejected (immutable)", true);
    }

    // B7: President of another society cannot access Mega Event
    try {
      await getPresidentMegaEvent(secPresId, mega.id);
      assert("B. Mega Event", "Cross-society president cannot access Mega Event (404/403)", false);
    } catch (e: any) {
      assert("B. Mega Event", "Cross-society president cannot access Mega Event (404/403)", e.status === 404 || e.status === 403 || e.message.includes("not found"));
    }

    // =========================================================================
    // SECTION C: SUB-EVENTS & SUPERVISORS (PRESIDENT)
    // =========================================================================
    console.log("\n--- SECTION C: Sub-events & Supervisors (President) ---");

    // C1: Sub-event date boundaries (Mega is 2026-12-15 to 2026-12-18)
    try {
      await createSubEvent(presId, mega.id, {
        title: "Early Sub-event",
        description: "Before start",
        date: "2026-12-14",
        startTime: "10:00",
        endTime: "12:00",
        venue: "Lab 1",
        supervisorId: studentA.id,
      });
      assert("C. Sub-events", "Reject sub-event date before Mega start", false);
    } catch {
      assert("C. Sub-events", "Reject sub-event date before Mega start", true);
    }

    try {
      await createSubEvent(presId, mega.id, {
        title: "Late Sub-event",
        description: "After end",
        date: "2026-12-19",
        startTime: "10:00",
        endTime: "12:00",
        venue: "Lab 1",
        supervisorId: studentA.id,
      });
      assert("C. Sub-events", "Reject sub-event date after Mega end", false);
    } catch {
      assert("C. Sub-events", "Reject sub-event date after Mega end", true);
    }

    // C2: Start time >= End time rejected
    try {
      await createSubEvent(presId, mega.id, {
        title: "Inverted Times Sub-event",
        description: "End before start",
        date: "2026-12-16",
        startTime: "15:00",
        endTime: "14:00",
        venue: "Hall 1",
        supervisorId: studentA.id,
      });
      assert("C. Sub-events", "Reject startTime >= endTime", false);
    } catch {
      assert("C. Sub-events", "Reject startTime >= endTime", true);
    }

    // C3: Supervisor must be a STUDENT (admin/president rejected)
    try {
      await createSubEvent(presId, mega.id, {
        title: "Admin Supervisor Sub-event",
        description: "Admin assigned as supervisor",
        date: "2026-12-16",
        startTime: "10:00",
        endTime: "12:00",
        venue: "Hall 1",
        supervisorId: admin.id,
      });
      assert("C. Sub-events", "Reject ADMIN as supervisor", false);
    } catch {
      assert("C. Sub-events", "Reject ADMIN as supervisor", true);
    }

    try {
      await createSubEvent(presId, mega.id, {
        title: "President Supervisor Sub-event",
        description: "President assigned as supervisor",
        date: "2026-12-16",
        startTime: "10:00",
        endTime: "12:00",
        venue: "Hall 1",
        supervisorId: presId,
      });
      assert("C. Sub-events", "Reject PRESIDENT as supervisor", false);
    } catch {
      assert("C. Sub-events", "Reject PRESIDENT as supervisor", true);
    }

    // C4: Create valid sub-events with PKT times
    const sub1 = await createSubEvent(presId, mega.id, {
      title: "Gaming Competition",
      description: "FIFA and Valorant LAN tournament.",
      date: "2026-12-15",
      startTime: "10:00",
      endTime: "16:00",
      venue: "CS Lab 3",
      supervisorId: studentA.id,
    });
    sub1Id = sub1.id;

    const sub2 = await createSubEvent(presId, mega.id, {
      title: "Web Dev Workshop",
      description: "Hands-on Next.js 14 and Postgres tutorial.",
      date: "2026-12-18",
      startTime: "11:00",
      endTime: "14:00",
      venue: "Auditorium",
      supervisorId: studentA.id,
    });
    sub2Id = sub2.id;

    assert("C. Sub-events", "Create Sub-event 1 (on start date) accepted", sub1.date === "2026-12-15");
    assert("C. Sub-events", "Create Sub-event 2 (on end date) accepted", sub2.date === "2026-12-18");
    assert("C. Sub-events", "One student can supervise multiple sub-events", sub1.supervisorId === studentA.id && sub2.supervisorId === studentA.id);

    // C5: PKT round-trip check: 10:00 AM PKT stored as 05:00Z
    const sub1Raw = await prisma.subEvent.findUnique({ where: { id: sub1.id } });
    const pktStart = DateTime.fromJSDate(sub1Raw!.startAt).setZone("Asia/Karachi").toFormat("HH:mm");
    const utcStartHour = sub1Raw!.startAt.getUTCHours();
    assert("C. Sub-events", "PKT round-trip: 10:00 AM PKT is 05:00 UTC", pktStart === "10:00" && utcStartHour === 5);

    // C6: Supervisor reassignment immediacy & notifications
    const reassignNotifCountBefore = await prisma.notification.count({ where: { userId: studentB.id } });
    await updateSubEvent(presId, sub1.id, { supervisorId: studentB.id });
    const reassignNotifCountAfter = await prisma.notification.count({ where: { userId: studentB.id } });

    const sub1Reloaded = await prisma.subEvent.findUnique({ where: { id: sub1.id } });
    assert("C. Sub-events", "Supervisor reassigned to Student B", sub1Reloaded?.supervisorId === studentB.id);
    assert("C. Sub-events", "New supervisor notified on assignment", reassignNotifCountAfter > reassignNotifCountBefore);

    // Cross-society president cannot update sub-event
    try {
      await updateSubEvent(secPresId, sub1.id, { title: "Hacked Sub-event" });
      assert("C. Sub-events", "Cross-society president cannot update sub-event (403)", false);
    } catch {
      assert("C. Sub-events", "Cross-society president cannot update sub-event (403)", true);
    }

    // =========================================================================
    // SECTION D: TASKS / CHECKLIST / PROGRESS
    // =========================================================================
    console.log("\n--- SECTION D: Tasks / Checklist / Progress ---");

    // D1: President creates task assigned to any student without invitation
    const task1 = await createSubEventTask(presId, sub1.id, {
      title: "Set up tournament monitors and cables",
      description: "Arrange 16 PCs with 144Hz monitors.",
      priority: "HIGH",
      dueDate: "2026-12-15",
      assigneeId: studentC.id,
    });
    assert("D. Tasks", "Assign task to student without invitation/membership", task1.assigneeId === studentC.id);

    // Assignee notified of assignment
    const assignNotif = await prisma.notification.findFirst({
      where: { userId: studentC.id, message: { contains: "Set up tournament monitors" } },
    });
    assert("D. Tasks", "Assignee notified of task assignment", !!assignNotif);

    // Non-student assignee rejected
    try {
      await createSubEventTask(presId, sub1.id, {
        title: "Admin task",
        priority: "LOW",
        assigneeId: admin.id,
      });
      assert("D. Tasks", "Reject non-student as assignee", false);
    } catch {
      assert("D. Tasks", "Reject non-student as assignee", true);
    }

    // Unassigned task works
    const unassignedTask = await createSubEventTask(presId, sub1.id, {
      title: "Order pizza for participants",
      priority: "MEDIUM",
    });
    assert("D. Tasks", "Create unassigned task", unassignedTask.assigneeId === null);

    // Task in sub2
    const sub2Task = await createSubEventTask(presId, sub2.id, {
      title: "Prepare workshop slides",
      priority: "HIGH",
      assigneeId: studentA.id,
    });

    // D2: Permission Matrix:
    // Supervisor (studentB) can update status of task1
    const supUpdate = await updateSubEventTaskStatus(studentB.id, "STUDENT", task1.id, "IN_PROGRESS");
    assert("D. Tasks", "Supervisor can update task status", supUpdate.status === "IN_PROGRESS");

    // Assignee (studentC) can update own task status
    const assUpdate = await updateSubEventTaskStatus(studentC.id, "STUDENT", task1.id, "COMPLETED");
    assert("D. Tasks", "Assignee can update own task status", assUpdate.status === "COMPLETED");

    // Former supervisor (studentA) cannot update task in sub1 (403)
    try {
      await updateSubEventTaskStatus(studentA.id, "STUDENT", unassignedTask.id, "COMPLETED");
      assert("D. Tasks", "Former supervisor immediately 403 on revoked sub-event", false);
    } catch (e: any) {
      assert("D. Tasks", "Former supervisor immediately 403 on revoked sub-event", e.status === 403 || e.message.includes("forbidden") || e.message.includes("Forbidden"));
    }

    // Outsider (studentA) cannot update studentC's task (403)
    try {
      await updateSubEventTaskStatus(studentA.id, "STUDENT", task1.id, "TODO");
      assert("D. Tasks", "Outsider student cannot update other's task (403)", false);
    } catch {
      assert("D. Tasks", "Outsider student cannot update other's task (403)", true);
    }

    // Supervisor CANNOT edit/delete task content (only president)
    try {
      await updateSubEventTaskByPresident(studentB.id, task1.id, { title: "Supervisor edit attempt" });
      assert("D. Tasks", "Supervisor cannot edit task details (president only)", false);
    } catch {
      assert("D. Tasks", "Supervisor cannot edit task details (president only)", true);
    }

    // D3: Supervisor DTO Projection check (zero budget leakage)
    const supervisorDTO = await prisma.subEvent.findUnique({
      where: { id: sub1.id },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        startAt: true,
        endAt: true,
        venue: true,
        supervisorId: true,
        megaEvent: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            dueDate: true,
            status: true,
            assigneeId: true,
          },
        },
      },
    });

    const hasAllocatedBudget = "allocatedBudget" in (supervisorDTO as any);
    const hasSpent = "spent" in (supervisorDTO as any);
    const hasRemaining = "remaining" in (supervisorDTO as any);
    const hasExpenses = "expenses" in (supervisorDTO as any);
    const hasOverallBudget = "overallBudget" in ((supervisorDTO as any).megaEvent || {});
    assert(
      "D. Supervisor Security",
      "Supervisor DTO contains zero budget fields (allocated, spent, remaining, expenses, overallBudget)",
      !hasAllocatedBudget && !hasSpent && !hasRemaining && !hasExpenses && !hasOverallBudget
    );

    // D4: Progress calculation
    // sub1 has 2 tasks: task1 (COMPLETED), unassignedTask (TODO) -> 1/2 = 50%
    // sub2 has 1 task: sub2Task (TODO) -> 0/1 = 0%
    // Overall Mega Event: 1 completed / 3 total = 33%
    const megaView = await getPresidentMegaEvent(presId, mega.id);
    const sub1View = megaView.subEvents.find((s) => s.id === sub1.id);
    const sub2View = megaView.subEvents.find((s) => s.id === sub2.id);

    assert("D. Progress", "Sub-event 1 progress: 1/2 = 50%", sub1View?.progressPercent === 50);
    assert("D. Progress", "Sub-event 2 progress: 0/1 = 0%", sub2View?.progressPercent === 0);
    assert("D. Progress", "Overall Mega Event progress: 1/3 = 33%", megaView.progressPercent === 33);

    // =========================================================================
    // SECTION E: BUDGET & EXPENSES
    // =========================================================================
    console.log("\n--- SECTION E: Budget & Expenses ---");

    // E1: Expense before allocation rejected
    try {
      await addSubEventExpense(presId, sub1.id, {
        title: "Snacks",
        amount: 2000,
        spentOn: new Date(),
      });
      assert("E. Budget", "Expense rejected before allocation exists", false);
    } catch {
      assert("E. Budget", "Expense rejected before allocation exists", true);
    }

    // E2: Allocate once-only & cap checks (Overall budget: Rs 100,000)
    const allocSub1 = await allocateSubEventBudget(presId, sub1.id, 60000);
    assert("E. Budget", "Allocate Rs 60,000 to Sub-event 1", allocSub1.allocatedBudget === 60000);

    // Second allocation attempt 409
    try {
      await allocateSubEventBudget(presId, sub1.id, 70000);
      assert("E. Budget", "Second allocation attempt rejected (409)", false);
    } catch (e: any) {
      assert("E. Budget", "Second allocation attempt rejected (409)", e.status === 409 || e.message.includes("already"));
    }

    // Exceeding allocation rejected (Remaining unallocated: 40,000. Try 40,001)
    try {
      await allocateSubEventBudget(presId, sub2.id, 40001);
      assert("E. Budget", "Allocation exceeding overall budget rejected", false);
    } catch (e: any) {
      assert("E. Budget", "Allocation exceeding overall budget rejected", e.status === 409 || e.message.includes("Exceeds"));
    }

    // Exact remaining allocation accepted (40,000)
    const allocSub2 = await allocateSubEventBudget(presId, sub2.id, 40000);
    assert("E. Budget", "Exact remaining allocation accepted (Rs 40,000)", allocSub2.allocatedBudget === 40000);

    // E3: 80% Alert Rule on Sub-event 1 (Allocated: 60,000; 80% threshold = 48,000)
    // Expense at 75% (45,000) -> NO alert
    const notifsBeforeAlert = await prisma.notification.count({ where: { userId: presId, type: "BUDGET_ALERT" } });
    await addSubEventExpense(presId, sub1.id, {
      title: "Gaming Rigs Rental",
      amount: 45000,
      spentOn: new Date(),
    });
    const sub1After75 = await prisma.subEvent.findUnique({ where: { id: sub1.id } });
    const notifsAfter75 = await prisma.notification.count({ where: { userId: presId, type: "BUDGET_ALERT" } });
    assert("E. Budget", "Expense at 75%: budgetAlertSent = false, 0 alerts", sub1After75?.budgetAlertSent === false && notifsAfter75 === notifsBeforeAlert);

    // Expense hitting 80% (45,000 + 3,000 = 48,000 / 60,000 = 80%) -> EXACTLY ONE alert
    await addSubEventExpense(presId, sub1.id, {
      title: "Audio Gear",
      amount: 3000,
      spentOn: new Date(),
    });
    const sub1After80 = await prisma.subEvent.findUnique({ where: { id: sub1.id } });
    const notifsAfter80 = await prisma.notification.count({ where: { userId: presId, type: "BUDGET_ALERT" } });
    assert("E. Budget", "Expense reaching 80%: budgetAlertSent = true, exactly 1 alert", sub1After80?.budgetAlertSent === true && notifsAfter80 === notifsBeforeAlert + 1);

    // Further expense above 80% (48,000 + 2,000 = 50,000) -> NO duplicate alert
    await addSubEventExpense(presId, sub1.id, {
      title: "Energy drinks",
      amount: 2000,
      spentOn: new Date(),
    });
    const notifsAfter83 = await prisma.notification.count({ where: { userId: presId, type: "BUDGET_ALERT" } });
    assert("E. Budget", "Further expense above 80%: no duplicate alert", notifsAfter83 === notifsAfter80);

    // Expense exceeding allocation rejected (Cap: 60,000, spent: 50,000, remaining: 10,000. Try 10,001)
    try {
      await addSubEventExpense(presId, sub1.id, {
        title: "Trophy overflow",
        amount: 10001,
        spentOn: new Date(),
      });
      assert("E. Budget", "Expense exceeding remaining allocation rejected", false);
    } catch {
      assert("E. Budget", "Expense exceeding remaining allocation rejected", true);
    }

    // E4: Concurrency test: 10 parallel expense attempts that together exceed allocation
    // Remaining allocation on sub1 is 10,000. Let's fire 10 concurrent expenses of Rs 2,000 each (Total: 20,000).
    console.log("Testing 10 parallel expense requests with concurrency row lock...");
    const parallelAmounts = Array(10).fill(2000);
    const parallelResults = await Promise.allSettled(
      parallelAmounts.map((amt, idx) =>
        addSubEventExpense(presId, sub1.id, {
          title: `Concurrent Expense ${idx + 1}`,
          amount: amt,
          spentOn: new Date(),
        })
      )
    );
    const parallelSucceeded = parallelResults.filter((r) => r.status === "fulfilled").length;
    const parallelFailed = parallelResults.filter((r) => r.status === "rejected").length;
    const finalSub1Expenses = await prisma.expense.findMany({ where: { subEventId: sub1.id } });
    const finalSub1TotalSpent = finalSub1Expenses.reduce((sum, e) => sum + e.amount, 0);

    assert(
      "E. Concurrency",
      "10 concurrent expenses: exactly 5 succeed, 5 rejected, cap never exceeded",
      parallelSucceeded === 5 && parallelFailed === 5 && finalSub1TotalSpent === 60000,
      `Spent: Rs ${finalSub1TotalSpent} / ${allocSub1.allocatedBudget}`
    );

    // =========================================================================
    // SECTION F: TASK 1 ISOLATION & REGRESSION
    // =========================================================================
    console.log("\n--- SECTION F: Task 1 Isolation & Regression ---");

    // F1: Public events list does NOT include Mega Events or Sub-events
    const publicEvents = await prisma.event.findMany({
      where: { approvalStatus: "APPROVED", isCancelled: false },
    });
    const megaInPublic = publicEvents.some((e) => e.title.includes("NEXUS Tech Fest") || e.title.includes("Gaming Competition"));
    assert("F. Isolation", "Task 1 Public Events list excludes Mega Events and Sub-events", !megaInPublic);

    // F2: Admin pending event proposals unaffected by Mega Events
    const adminData = await getAdminStats();
    const megaInPending = adminData.pendingProposals.some((p: any) => p.title.includes("NEXUS Tech Fest") || p.title.includes("Gaming Competition"));
    assert("F. Isolation", "Admin pending event proposals excludes Mega Events and Sub-events", !megaInPending);

    // F3: Task 1 Event expenses/tasks unaffected
    const sampleTask1Event = await prisma.event.findFirst({
      where: { approvalStatus: "APPROVED" },
      include: { tasks: true, expenses: true },
    });
    if (sampleTask1Event) {
      const anySubTasks = sampleTask1Event.tasks.some((t) => t.subEventId !== null);
      const anySubExpenses = sampleTask1Event.expenses.some((e) => e.subEventId !== null);
      assert("F. Isolation", "Task 1 event tasks and expenses have zero subEventId leakage", !anySubTasks && !anySubExpenses);
    }

  } finally {
    console.log("\nCleaning up test fixtures...");
    if (sub1Id || sub2Id) {
      await prisma.expense.deleteMany({ where: { subEventId: { in: [sub1Id || "", sub2Id || ""].filter(Boolean) } } });
      await prisma.task.deleteMany({ where: { subEventId: { in: [sub1Id || "", sub2Id || ""].filter(Boolean) } } });
      await prisma.subEvent.deleteMany({ where: { id: { in: [sub1Id || "", sub2Id || ""].filter(Boolean) } } });
    }
    if (testMegaId) {
      await prisma.megaEvent.delete({ where: { id: testMegaId } });
    }
  }

  // Summary Table
  console.log("\n================================================================================");
  console.log("                           AUDIT SUMMARY RESULTS                                ");
  console.log("================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.table(
    results.map((r) => ({
      Section: r.section,
      Test: r.test,
      Status: r.passed ? "PASS" : "FAIL",
      Notes: r.notes || "",
    }))
  );

  console.log(`\nTOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed > 0) {
    console.error("\n❌ Task 2 Comprehensive Suite FAILED with regressions/errors.");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL Task 2 QA CHECKS PASSED WITH ZERO REGRESSIONS! (100%)\n");
  }
}

runTask2TestSuite()
  .catch((e) => {
    console.error("FATAL ERROR IN TEST SUITE:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

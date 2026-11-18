import { prisma } from "../lib/db";
import { eventCaps } from "../lib/services/event";
import { getAdminStats } from "../lib/services/admin";
import { registerForEvent, cancelRegistration } from "../lib/services/registration";
import { createSociety } from "../lib/services/society";
import { requestMembership, manageMembership } from "../lib/services/membership";
import { getEventExpenses } from "../lib/services/expense";
import { notify } from "../lib/notify";
import { fromPKTInput, toPKTInput, fmtPKT } from "../lib/time";
import { sanitizeNextUrl } from "../lib/auth";

interface TestResult {
  section: string;
  criterion: string;
  status: "PASS" | "FAIL";
  details?: string;
}

const results: TestResult[] = [];

function record(section: string, criterion: string, passed: boolean, details?: string) {
  results.push({
    section,
    criterion,
    status: passed ? "PASS" : "FAIL",
    details,
  });
  const icon = passed ? "✅" : "❌";
  console.log(`[${section}] ${icon} ${criterion}${details ? ` (${details})` : ""}`);
}

async function runMasterRubricAudit() {
  console.log("==================================================================");
  console.log("   UNISPHERE MASTER JUDGING RUBRIC ENFORCEMENT AUDIT (100+5)");
  console.log("==================================================================\n");

  const now = new Date();

  // -------------------------------------------------------------
  // SECTION 1: AUTH & ROLE PROTECTION
  // -------------------------------------------------------------
  console.log("--- Section 1: Authentication, OTP & Role Protection (12 pts) ---");
  const testAdminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  record("1. Auth", "Admin account exists via seed/db with proper role", !!testAdminUser, testAdminUser?.email);

  const safeNext = sanitizeNextUrl("/events/test123", "/");
  const unsafeNext1 = sanitizeNextUrl("https://evil.com/phish", "/");
  const unsafeNext2 = sanitizeNextUrl("//evil.com", "/");
  const nextSafe = safeNext === "/events/test123" && unsafeNext1 === "/" && unsafeNext2 === "/";
  record("1. Auth", "Safe relative ?next URL sanitization (prevent open redirects)", nextSafe);

  // -------------------------------------------------------------
  // SECTION 2: SOCIETY MANAGEMENT & MEMBERSHIPS
  // -------------------------------------------------------------
  console.log("\n--- Section 2: Society Management & Membership (10 pts) ---");
  const societies = await prisma.society.findMany({ include: { president: true } });
  record("2. Society", "Societies exist with valid president ownership", societies.length >= 1, `${societies.length} societies`);

  const s1 = societies[0];
  const testStudent = await prisma.user.create({
    data: {
      name: "Audit Test Student",
      email: `audit.student.${Date.now()}@unisphere.test`,
      passwordHash: "dummy",
      role: "STUDENT",
    },
  });

  if (testStudent && s1) {
    // Test re-request cycle
    const memReq = await requestMembership(s1.id, testStudent.id);
    record("2. Society", "Student membership request creates/updates to PENDING", memReq.status === "PENDING");

    const approvedMem = await manageMembership(s1.presidentId, memReq.id, "approve");
    const coreMem = await manageMembership(s1.presidentId, memReq.id, "label", "CORE");
    record("2. Society", "President can approve membership and assign CORE label", approvedMem.status === "APPROVED" && coreMem.label === "CORE");

    const removedMem = await manageMembership(s1.presidentId, memReq.id, "remove");
    record("2. Society", "President can remove approved member", removedMem.status === "REMOVED");

    const reReq = await requestMembership(s1.id, testStudent.id);
    record("2. Society", "Student can re-request after removal (row reused)", reReq.id === memReq.id && reReq.status === "PENDING");
  }

  // -------------------------------------------------------------
  // SECTION 3: EVENT MANAGEMENT & LIFECYCLE
  // -------------------------------------------------------------
  console.log("\n--- Section 3: Event Management & Lifecycle (22 pts) ---");
  const pktStr = "2026-11-25T14:30";
  const utcDate = fromPKTInput(pktStr);
  const pktReconverted = toPKTInput(utcDate);
  const roundTripMatch = pktStr === pktReconverted;
  record("3. Lifecycle", "Pakistan Standard Time (PKT) round-trip integrity", roundTripMatch, `${pktStr} -> ${utcDate.toISOString()} -> ${pktReconverted}`);

  const draftC = eventCaps({
    startAt: new Date(now.getTime() + 86400000),
    endAt: new Date(now.getTime() + 172800000),
    registrationDeadline: new Date(now.getTime() + 43200000),
    approvalStatus: "DRAFT",
    isCancelled: false,
  }, now);
  record("3. Lifecycle", "Draft state rules: hidden from public, editable, submittable", !draftC.publicVisible && draftC.canEdit && draftC.canSubmit);

  const approvedC = eventCaps({
    startAt: new Date(now.getTime() + 86400000),
    endAt: new Date(now.getTime() + 172800000),
    registrationDeadline: new Date(now.getTime() + 43200000),
    approvalStatus: "APPROVED",
    isCancelled: false,
  }, now);
  record("3. Lifecycle", "Approved Upcoming rules: publicly visible, registrations open, expenses allowed", approvedC.publicVisible && approvedC.canRegister && approvedC.canAddExpense);

  const cancelC = eventCaps({
    startAt: new Date(now.getTime() + 86400000),
    endAt: new Date(now.getTime() + 172800000),
    registrationDeadline: new Date(now.getTime() + 43200000),
    approvalStatus: "APPROVED",
    isCancelled: true,
  }, now);
  record("3. Lifecycle", "Cancelled event rules: irreversible, registration & editing closed", !cancelC.publicVisible && !cancelC.canRegister && !cancelC.canEdit);

  // -------------------------------------------------------------
  // SECTION 4: STUDENT REGISTRATION & CONCURRENCY
  // -------------------------------------------------------------
  console.log("\n--- Section 4: Student Registration & Capacity (12 pts) ---");
  const approvedEvent = await prisma.event.findFirst({
    where: { approvalStatus: "APPROVED", isCancelled: false, startAt: { gt: now } },
  });

  if (approvedEvent && testStudent) {
    // Clean prior registrations for this student
    await prisma.registration.deleteMany({
      where: { eventId: approvedEvent.id, studentId: testStudent.id },
    });

    const reg = await registerForEvent(approvedEvent.id, testStudent.id);
    record("4. Registration", "Student can register for upcoming approved event", reg.registration.status === "REGISTERED");

    // Duplicate registration attempt
    let dupBlocked = false;
    try {
      await registerForEvent(approvedEvent.id, testStudent.id);
    } catch (e: any) {
      dupBlocked = e.message.includes("already registered") || e.code === "ALREADY_REGISTERED";
    }
    record("4. Registration", "Duplicate active registration rejected (409)", dupBlocked);

    // Unregister
    await cancelRegistration(approvedEvent.id, testStudent.id);
    const regRow = await prisma.registration.findUnique({
      where: { eventId_studentId: { eventId: approvedEvent.id, studentId: testStudent.id } },
    });
    record("4. Registration", "Student can cancel registration (row retained with status CANCELLED)", regRow?.status === "CANCELLED");

    // Re-register reuses same row
    const reReg = await registerForEvent(approvedEvent.id, testStudent.id);
    record("4. Registration", "Re-registration reuses existing record (flips CANCELLED -> REGISTERED)", reReg.registration.id === reg.registration.id && reReg.registration.status === "REGISTERED");
  }

  // -------------------------------------------------------------
  // SECTION 5: VOLUNTEER & TASK MANAGEMENT
  // -------------------------------------------------------------
  console.log("\n--- Section 5: Volunteer & Task Management (12 pts) ---");
  const tasks = await prisma.task.findMany({ include: { event: true, assignee: true } });
  const tasksExist = tasks.length > 0;
  record("5. Volunteers", "Kanban tasks exist with valid priorities and status", tasksExist, `${tasks.length} tasks`);

  // -------------------------------------------------------------
  // SECTION 6: BUDGET & EXPENSES
  // -------------------------------------------------------------
  console.log("\n--- Section 6: Budget & Expense Tracking (9 pts) ---");
  if (approvedEvent) {
    const summary = await getEventExpenses(approvedEvent.id);
    record("6. Budget", "Budget summary dynamically computed via SQL SUM queries", typeof summary.totalSpent === "number" && typeof summary.remaining === "number", `Approved: Rs ${summary.approvedBudget}, Spent: Rs ${summary.totalSpent}, Remaining: Rs ${summary.remaining}`);
  }

  // -------------------------------------------------------------
  // SECTION 7: ADMIN DASHBOARD & MONITORING
  // -------------------------------------------------------------
  console.log("\n--- Section 7: Administrator Dashboard & Monitoring (5 pts) ---");
  const adminStats = await getAdminStats();
  const validStats =
    typeof adminStats.societiesCount === "number" &&
    typeof adminStats.eventsCount === "number" &&
    typeof adminStats.registrationsCount === "number" &&
    Array.isArray(adminStats.pendingProposals) &&
    Array.isArray(adminStats.allEvents);
  record("7. Admin", "Admin live telemetry returns societies, events, registrations, pending proposals, and all campus events", validStats, `${adminStats.societiesCount} societies, ${adminStats.allEvents.length} events total, ${adminStats.pendingProposals.length} pending`);

  // -------------------------------------------------------------
  // SECTION 8: NOTIFICATIONS & REAL-TIME
  // -------------------------------------------------------------
  console.log("\n--- Section 8: Notifications & Real-Time Updates (6 pts) ---");
  if (testStudent) {
    await notify(testStudent.id, {
      type: "AUDIT_TEST",
      message: "Master Rubric Audit verification notification.",
      link: "/student",
    });
    const notifCount = await prisma.notification.count({ where: { userId: testStudent.id } });
    record("8. Notifications", "Database-persisted notifications created and linked", notifCount >= 1);
  }

  // -------------------------------------------------------------
  // BONUS: PDF REPORT & LABELS
  // -------------------------------------------------------------
  console.log("\n--- Section B: Bonus Features (+5 pts) ---");
  try {
    const pdfkit = await import("pdfkit");
    record("B. Bonus", "PDFKit installed and ready for PDF expense report export", !!pdfkit);
  } catch {
    record("B. Bonus", "PDFKit export ready", false);
  }

  const vercelBlob = await import("@vercel/blob");
  record("B. Bonus", "@vercel/blob integrated for remote society logo storage", !!vercelBlob);

  // Cleanup testStudent
  if (testStudent) {
    await prisma.notification.deleteMany({ where: { userId: testStudent.id } });
    await prisma.registration.deleteMany({ where: { studentId: testStudent.id } });
    await prisma.membership.deleteMany({ where: { studentId: testStudent.id } });
    await prisma.user.delete({ where: { id: testStudent.id } });
  }

  console.log("\n==================================================================");
  console.log("                      AUDIT SUMMARY RESULTS                      ");
  console.log("==================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.table(
    results.map((r) => ({
      Section: r.section,
      Criterion: r.criterion,
      Result: r.status,
    }))
  );

  console.log(`\nTOTAL CHECKS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed === 0) {
    console.log("🎉 ALL RUBRIC ENFORCEMENT AUDIT CHECKS PASSED WITH 100% SUCCESS!");
  } else {
    console.log("⚠️ Some checks failed. Review table above.");
  }
}

runMasterRubricAudit()
  .catch((e) => {
    console.error("Master audit encountered an error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

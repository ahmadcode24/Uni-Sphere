import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DateTime } from "luxon";

const prisma = new PrismaClient();
const ZONE = "Asia/Karachi";

async function main() {
  console.log("🌱 Starting database seed...");

  // Clean existing tables
  await prisma.notification.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.task.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.meetingInvite.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.event.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.society.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  const now = DateTime.now().setZone(ZONE);

  // 1. Users
  const adminPass = bcrypt.hashSync("Admin@12345", 10);
  const commonPass = bcrypt.hashSync("Pass@12345", 10);

  const admin = await prisma.user.create({
    data: {
      name: "UniSphere Admin",
      email: "ahmadcode24@gmail.com",
      passwordHash: adminPass,
      role: "ADMIN",
    },
  });

  const pres1 = await prisma.user.create({
    data: {
      name: "Taha Khan",
      email: "president1@unisphere.test",
      passwordHash: commonPass,
      role: "PRESIDENT",
    },
  });

  const pres2 = await prisma.user.create({
    data: {
      name: "Fatima Noor",
      email: "president2@unisphere.test",
      passwordHash: commonPass,
      role: "PRESIDENT",
    },
  });

  const students = [];
  const studentNames = [
    "Ali Raza",
    "Sara Ahmed",
    "Bilal Tariq",
    "Zainab Bibi",
    "Hamza Sheikh",
    "Ayesha Malik",
  ];

  for (let i = 1; i <= 6; i++) {
    const student = await prisma.user.create({
      data: {
        name: studentNames[i - 1],
        email: `student${i}@unisphere.test`,
        passwordHash: commonPass,
        role: "STUDENT",
      },
    });
    students.push(student);
  }

  // 2. Societies
  const society1 = await prisma.society.create({
    data: {
      name: "ACM Student Chapter",
      description: "Premier university computing society fostering open-source software, competitive programming, and AI research.",
      category: "Technology",
      contactEmail: "acm@unisphere.test",
      contactPhone: "+92 300 1234567",
      presidentId: pres1.id,
    },
  });

  const society2 = await prisma.society.create({
    data: {
      name: "Dramatic Arts Guild",
      description: "University theatrical and literary performance society dedicated to youth stagecraft and artistic storytelling.",
      category: "Arts & Culture",
      contactEmail: "drama@unisphere.test",
      contactPhone: "+92 301 7654321",
      presidentId: pres2.id,
    },
  });

  // Memberships
  // Society 1: student 0,1 approved; student 2 pending; student 3 rejected
  await prisma.membership.createMany({
    data: [
      { societyId: society1.id, studentId: students[0].id, status: "APPROVED", label: "CORE" },
      { societyId: society1.id, studentId: students[1].id, status: "APPROVED", label: "MEMBER" },
      { societyId: society1.id, studentId: students[2].id, status: "PENDING", label: "MEMBER" },
      { societyId: society1.id, studentId: students[3].id, status: "REJECTED", label: "MEMBER" },
      // Society 2
      { societyId: society2.id, studentId: students[3].id, status: "APPROVED", label: "MEMBER" },
      { societyId: society2.id, studentId: students[4].id, status: "APPROVED", label: "CORE" },
      { societyId: society2.id, studentId: students[5].id, status: "PENDING", label: "MEMBER" },
    ],
  });

  // 3. Events across all states
  // Event A: Approved Upcoming (HackNova 2026)
  const eventApprovedUpcoming = await prisma.event.create({
    data: {
      societyId: society1.id,
      title: "HackNova 2026",
      description: "The flagship 24-hour campus hackathon. Build innovative AI, Web, and hardware solutions with mentorship and cash prizes.",
      venue: "Main Auditorium & Computing Labs",
      startAt: now.plus({ days: 5, hours: 9 }).toUTC().toJSDate(),
      endAt: now.plus({ days: 6, hours: 18 }).toUTC().toJSDate(),
      registrationDeadline: now.plus({ days: 3 }).toUTC().toJSDate(),
      capacity: 30,
      proposedBudget: 45000,
      approvedBudget: 45000,
      approvalStatus: "APPROVED",
      hasBeenApproved: true,
      decidedAt: now.minus({ days: 2 }).toUTC().toJSDate(),
      submittedAt: now.minus({ days: 4 }).toUTC().toJSDate(),
      adminRemarks: "Approved. Venue access confirmed with IT services.",
    },
  });

  // Event B: Approved Ongoing (AI & Data Workshop)
  const eventApprovedOngoing = await prisma.event.create({
    data: {
      societyId: society1.id,
      title: "Hands-on PyTorch & LLM Workshop",
      description: "Live intensive workshop covering modern neural network architectures and local model inference.",
      venue: "Lab CS-3",
      startAt: now.minus({ hours: 2 }).toUTC().toJSDate(),
      endAt: now.plus({ hours: 4 }).toUTC().toJSDate(),
      registrationDeadline: now.minus({ days: 1 }).toUTC().toJSDate(),
      capacity: 25,
      proposedBudget: 15000,
      approvedBudget: 15000,
      approvalStatus: "APPROVED",
      hasBeenApproved: true,
      decidedAt: now.minus({ days: 3 }).toUTC().toJSDate(),
      adminRemarks: "Approved.",
    },
  });

  // Event C: Approved Completed (Fall CodeSprint)
  const eventApprovedCompleted = await prisma.event.create({
    data: {
      societyId: society1.id,
      title: "Fall CodeSprint 2025",
      description: "Semester-opening algorithmic problem solving sprint with real-time leaderboard.",
      venue: "Software Engineering Hall",
      startAt: now.minus({ days: 10, hours: 10 }).toUTC().toJSDate(),
      endAt: now.minus({ days: 10, hours: 4 }).toUTC().toJSDate(),
      registrationDeadline: now.minus({ days: 12 }).toUTC().toJSDate(),
      capacity: 40,
      proposedBudget: 20000,
      approvedBudget: 20000,
      approvalStatus: "APPROVED",
      hasBeenApproved: true,
      decidedAt: now.minus({ days: 15 }).toUTC().toJSDate(),
      adminRemarks: "Approved as submitted.",
    },
  });

  // Event D: Pending (Web3 & Distributed Systems Symposium)
  const eventPending = await prisma.event.create({
    data: {
      societyId: society1.id,
      title: "Web3 & Distributed Systems Symposium",
      description: "Guest lectures by industry leads on consensus algorithms and cryptography.",
      venue: "Executive Seminar Hall",
      startAt: now.plus({ days: 12, hours: 14 }).toUTC().toJSDate(),
      endAt: now.plus({ days: 12, hours: 18 }).toUTC().toJSDate(),
      registrationDeadline: now.plus({ days: 10 }).toUTC().toJSDate(),
      capacity: 50,
      proposedBudget: 28000,
      approvalStatus: "PENDING",
      submittedAt: now.minus({ hours: 5 }).toUTC().toJSDate(),
    },
  });

  // Event E: Draft (Cloud Computing Masterclass)
  const eventDraft = await prisma.event.create({
    data: {
      societyId: society1.id,
      title: "Cloud Computing Masterclass",
      description: "Hands-on session with Linux servers and container orchestration.",
      venue: "Room B-12",
      startAt: now.plus({ days: 20, hours: 11 }).toUTC().toJSDate(),
      endAt: now.plus({ days: 20, hours: 15 }).toUTC().toJSDate(),
      registrationDeadline: now.plus({ days: 18 }).toUTC().toJSDate(),
      capacity: 35,
      proposedBudget: 12000,
      approvalStatus: "DRAFT",
    },
  });

  // Event F: Approved Upcoming for Society 2 (Spring Theatre Fest)
  const eventSociety2Upcoming = await prisma.event.create({
    data: {
      societyId: society2.id,
      title: "Spring Theatre Fest 2026",
      description: "Two-night university stage drama featuring original plays and musical monologues.",
      venue: "Open Air Theatre",
      startAt: now.plus({ days: 8, hours: 18 }).toUTC().toJSDate(),
      endAt: now.plus({ days: 9, hours: 22 }).toUTC().toJSDate(),
      registrationDeadline: now.plus({ days: 6 }).toUTC().toJSDate(),
      capacity: 100,
      proposedBudget: 60000,
      approvedBudget: 60000,
      approvalStatus: "APPROVED",
      hasBeenApproved: true,
      decidedAt: now.minus({ days: 1 }).toUTC().toJSDate(),
      adminRemarks: "Approved. Please coordinate sound equipment with the audio department.",
    },
  });

  // Event G: Rejected (Open Mic Comedy Night)
  const eventRejected = await prisma.event.create({
    data: {
      societyId: society2.id,
      title: "Open Mic & Standup Night",
      description: "Unfiltered comedy performances by university students.",
      venue: "Cafeteria Terrace",
      startAt: now.plus({ days: 14, hours: 19 }).toUTC().toJSDate(),
      endAt: now.plus({ days: 14, hours: 22 }).toUTC().toJSDate(),
      registrationDeadline: now.plus({ days: 13 }).toUTC().toJSDate(),
      capacity: 60,
      proposedBudget: 18000,
      approvalStatus: "REJECTED",
      decidedAt: now.minus({ days: 2 }).toUTC().toJSDate(),
      submittedAt: now.minus({ days: 3 }).toUTC().toJSDate(),
      adminRemarks: "Proposed budget is too high for an informal terrace gathering. Revise venue and safety measures.",
    },
  });

  // Event H: Cancelled (Monologue Competition)
  const eventCancelled = await prisma.event.create({
    data: {
      societyId: society2.id,
      title: "Solo Monologue Competition",
      description: "Annual solo dramatic competition.",
      venue: "Seminar Room 1",
      startAt: now.plus({ days: 16, hours: 15 }).toUTC().toJSDate(),
      endAt: now.plus({ days: 16, hours: 18 }).toUTC().toJSDate(),
      registrationDeadline: now.plus({ days: 14 }).toUTC().toJSDate(),
      capacity: 20,
      proposedBudget: 8000,
      approvalStatus: "APPROVED",
      hasBeenApproved: true,
      isCancelled: true,
      decidedAt: now.minus({ days: 5 }).toUTC().toJSDate(),
      adminRemarks: "Approved.",
    },
  });

  // 4. Registrations
  // Register students to HackNova
  await prisma.registration.createMany({
    data: [
      { eventId: eventApprovedUpcoming.id, studentId: students[0].id, status: "REGISTERED" },
      { eventId: eventApprovedUpcoming.id, studentId: students[1].id, status: "REGISTERED" },
      { eventId: eventApprovedUpcoming.id, studentId: students[2].id, status: "REGISTERED" },
      // Register students to Ongoing Workshop
      { eventId: eventApprovedOngoing.id, studentId: students[0].id, status: "REGISTERED" },
      { eventId: eventApprovedOngoing.id, studentId: students[3].id, status: "REGISTERED" },
      // Register to Theatre Fest
      { eventId: eventSociety2Upcoming.id, studentId: students[3].id, status: "REGISTERED" },
      { eventId: eventSociety2Upcoming.id, studentId: students[4].id, status: "REGISTERED" },
      // Cancelled event registrations
      { eventId: eventCancelled.id, studentId: students[5].id, status: "CANCELLED" },
    ],
  });

  // 5. Volunteer Invitations
  // Student 0 accepted HackNova invite
  // Student 1 pending HackNova invite
  // Student 2 declined HackNova invite
  const inv1 = await prisma.invitation.create({
    data: {
      eventId: eventApprovedUpcoming.id,
      studentId: students[0].id,
      status: "ACCEPTED",
      respondedAt: now.minus({ days: 1 }).toUTC().toJSDate(),
    },
  });

  await prisma.invitation.create({
    data: {
      eventId: eventApprovedUpcoming.id,
      studentId: students[1].id,
      status: "PENDING",
    },
  });

  await prisma.invitation.create({
    data: {
      eventId: eventApprovedUpcoming.id,
      studentId: students[2].id,
      status: "DECLINED",
      respondedAt: now.minus({ hours: 12 }).toUTC().toJSDate(),
    },
  });

  // 6. Tasks for HackNova (only ACCEPTED volunteers can be assigned)
  await prisma.task.create({
    data: {
      eventId: eventApprovedUpcoming.id,
      title: "Prepare Hacker Badges & Registration Desk",
      description: "Print QR check-in badges and organize welcome kits for 30 attendees.",
      priority: "HIGH",
      dueDate: now.plus({ days: 4, hours: 17 }).toUTC().toJSDate(),
      status: "IN_PROGRESS",
      assigneeId: students[0].id,
    },
  });

  await prisma.task.create({
    data: {
      eventId: eventApprovedUpcoming.id,
      title: "Configure High-Speed WiFi & Lab Power Strips",
      description: "Ensure networking switches and backup power connections are routed in Lab CS-1 and CS-2.",
      priority: "MEDIUM",
      dueDate: now.plus({ days: 3, hours: 12 }).toUTC().toJSDate(),
      status: "TODO",
      assigneeId: students[0].id,
    },
  });

  await prisma.task.create({
    data: {
      eventId: eventApprovedUpcoming.id,
      title: "Publish Hackathon Challenge Tracks",
      description: "Finalize judge rubric and announce prompt themes on portal.",
      priority: "LOW",
      dueDate: now.minus({ days: 1 }).toUTC().toJSDate(),
      status: "COMPLETED",
      assigneeId: students[0].id,
    },
  });

  // 7. Expenses for HackNova (approved budget = 45000)
  await prisma.expense.create({
    data: {
      eventId: eventApprovedUpcoming.id,
      title: "Hacker Welcome Packs & Lanyards",
      amount: 14500,
      note: "Printed badges, stickers, and lanyard cords from Alpha Printers.",
      spentOn: now.minus({ days: 1 }).toUTC().toJSDate(),
    },
  });

  await prisma.expense.create({
    data: {
      eventId: eventApprovedUpcoming.id,
      title: "Networking Routers & Cable Extension Cords",
      amount: 8200,
      note: "Procured from IT Hardware Store.",
      spentOn: now.minus({ hours: 18 }).toUTC().toJSDate(),
    },
  });

  // Expenses for Completed Event
  await prisma.expense.create({
    data: {
      eventId: eventApprovedCompleted.id,
      title: "Winner Trophies and Certificates",
      amount: 12000,
      note: "Shields for top 3 teams.",
      spentOn: now.minus({ days: 9 }).toUTC().toJSDate(),
    },
  });

  // 8. Notifications
  await prisma.notification.create({
    data: {
      userId: pres1.id,
      type: "EVENT_APPROVED",
      message: "Your event 'HackNova 2026' was approved by the administration.",
      link: `/president/events/${eventApprovedUpcoming.id}`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: "EVENT_SUBMITTED",
      message: "New proposal submitted: 'Web3 & Distributed Systems Symposium'.",
      link: `/admin/review/${eventPending.id}`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: students[0].id,
      type: "VOLUNTEER_INVITATION",
      message: "You have been invited to volunteer for 'HackNova 2026'.",
      link: `/student/invitations`,
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log("   Admin: ahmadcode24@gmail.com (Admin@12345)");
  console.log("   Presidents: president1@unisphere.test, president2@unisphere.test (Pass@12345)");
  console.log("   Students: student1@unisphere.test .. student6@unisphere.test (Pass@12345)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


import { prisma } from "../lib/db";
import { DateTime } from "luxon";

export async function seedTask2Demo() {
  console.log("🌱 Seeding Task 2 Demo Data: NEXUS Tech Fest 2026...");

  // 1. Fetch starter entities
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const society = await prisma.society.findFirst({
    where: { name: "NEXUS Society" },
    include: { president: true },
  });
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { email: "asc" },
    take: 3,
  });

  if (!admin || !society || students.length < 3) {
    throw new Error("Missing required starter data. Run 'npm run db:seed' and 'npx tsx scripts/seed-task2-starter.ts' first.");
  }

  const presId = society.presidentId;
  const [student1, student2, student3] = students;

  // 2. Clean up any existing demo Mega Event with this title for idempotency
  const existing = await prisma.megaEvent.findFirst({
    where: { title: "NEXUS Tech Fest 2026", societyId: society.id },
    include: { subEvents: true },
  });

  if (existing) {
    const subIds = existing.subEvents.map((s) => s.id);
    await prisma.expense.deleteMany({ where: { subEventId: { in: subIds } } });
    await prisma.task.deleteMany({ where: { subEventId: { in: subIds } } });
    await prisma.subEvent.deleteMany({ where: { megaEventId: existing.id } });
    await prisma.megaEvent.delete({ where: { id: existing.id } });
    console.log("   🧹 Removed existing NEXUS Tech Fest 2026 demo data.");
  }

  // 3. Create Mega Event
  const mega = await prisma.megaEvent.create({
    data: {
      title: "NEXUS Tech Fest 2026",
      description: "Annual multi-day flagship university technology fest featuring gaming competitions, hands-on development workshops, hackathons, and research project exhibitions.",
      societyId: society.id,
      presidentId: presId,
      createdById: admin.id,
      startDate: "2026-12-15",
      endDate: "2026-12-18",
      overallBudget: 150000,
    },
  });
  console.log(`   ✅ Created Mega Event: "${mega.title}" (Rs 150,000 PKR)`);

  // Helper for PKT times
  const parsePkt = (dateStr: string, timeStr: string) => {
    return DateTime.fromISO(`${dateStr}T${timeStr}:00`, { zone: "Asia/Karachi" }).toJSDate();
  };

  // 4. Sub-event 1: Gaming Competition (at 80% budget alert)
  const sub1 = await prisma.subEvent.create({
    data: {
      megaEventId: mega.id,
      title: "Gaming Competition",
      description: "Valorant 5v5 & EA FC 26 LAN tournament across university departments.",
      date: "2026-12-15",
      startAt: parsePkt("2026-12-15", "10:00"),
      endAt: parsePkt("2026-12-15", "17:00"),
      venue: "Computer Science Lab 3 & 4",
      supervisorId: student1.id,
      allocatedBudget: 50000,
      budgetAlertSent: true,
    },
  });

  // Expenses for sub1: Rs 40,000 / 50,000 (80% threshold reached!)
  await prisma.expense.createMany({
    data: [
      {
        subEventId: sub1.id,
        title: "Gaming Rigs & Monitor Rentals",
        amount: 30000,
        note: "10 high-refresh gaming displays and power distribution strips",
        spentOn: parsePkt("2026-12-15", "11:00"),
      },
      {
        subEventId: sub1.id,
        title: "Trophies and Participant Energy Drinks",
        amount: 10000,
        note: "1st/2nd place shields and refreshment cans",
        spentOn: parsePkt("2026-12-15", "14:00"),
      },
    ],
  });

  // Notification for president
  await prisma.notification.create({
    data: {
      userId: presId,
      type: "BUDGET_ALERT",
      message: `'Gaming Competition' has reached 80% of its budget (Spent: Rs 40,000 / Rs 50,000 PKR).`,
      link: `/president/mega-events/${mega.id}`,
    },
  });

  // Tasks for sub1
  await prisma.task.createMany({
    data: [
      {
        subEventId: sub1.id,
        title: "Network setup & local dedicated server testing",
        description: "Configure low-latency switch and test custom lobby ping.",
        priority: "HIGH",
        dueDate: parsePkt("2026-12-15", "09:30"),
        status: "COMPLETED",
        assigneeId: student2.id,
      },
      {
        subEventId: sub1.id,
        title: "Tournament bracket management & live scoring",
        description: "Maintain Challonge tournament bracket and display on projector.",
        priority: "HIGH",
        dueDate: parsePkt("2026-12-15", "11:00"),
        status: "IN_PROGRESS",
        assigneeId: student3.id,
      },
      {
        subEventId: sub1.id,
        title: "Prize distribution stage prep",
        description: "Setup podium and certificates for closing ceremony.",
        priority: "MEDIUM",
        dueDate: parsePkt("2026-12-15", "16:00"),
        status: "TODO",
        assigneeId: null,
      },
    ],
  });

  // 5. Sub-event 2: Web Development Workshop
  const sub2 = await prisma.subEvent.create({
    data: {
      megaEventId: mega.id,
      title: "Web Development Workshop",
      description: "Hands-on Next.js 14, Tailwind CSS & PostgreSQL bootcamp for beginner and intermediate builders.",
      date: "2026-12-16",
      startAt: parsePkt("2026-12-16", "11:00"),
      endAt: parsePkt("2026-12-16", "15:00"),
      venue: "Executive Seminar Hall A",
      supervisorId: student2.id,
      allocatedBudget: 40000,
      budgetAlertSent: false,
    },
  });

  await prisma.expense.create({
    data: {
      subEventId: sub2.id,
      title: "Guest Speaker Honorarium & Workshop Booklets",
      amount: 15000,
      note: "Printed cheatsheets and speaker gift",
      spentOn: parsePkt("2026-12-16", "11:30"),
    },
  });

  await prisma.task.createMany({
    data: [
      {
        subEventId: sub2.id,
        title: "Install Node.js & VS Code extensions on lab PCs",
        description: "Set up development environments on 30 lab machines.",
        priority: "HIGH",
        dueDate: parsePkt("2026-12-16", "10:00"),
        status: "COMPLETED",
        assigneeId: student1.id,
      },
      {
        subEventId: sub2.id,
        title: "Distribute starter repository GitHub template links",
        description: "Share project templates and documentation links with attendees.",
        priority: "MEDIUM",
        dueDate: parsePkt("2026-12-16", "11:15"),
        status: "TODO",
        assigneeId: student3.id,
      },
    ],
  });

  // 6. Sub-event 3: Quiz Competition
  const sub3 = await prisma.subEvent.create({
    data: {
      megaEventId: mega.id,
      title: "Quiz Competition",
      description: "Fast-paced tech, computer architecture, algorithms, and logic trivia tournament.",
      date: "2026-12-17",
      startAt: parsePkt("2026-12-17", "13:00"),
      endAt: parsePkt("2026-12-17", "16:00"),
      venue: "Central Auditorium",
      supervisorId: student3.id,
      allocatedBudget: 30000,
      budgetAlertSent: false,
    },
  });

  await prisma.expense.create({
    data: {
      subEventId: sub3.id,
      title: "Buzzer Hardware & Refreshments",
      amount: 5000,
      spentOn: parsePkt("2026-12-17", "12:00"),
    },
  });

  await prisma.task.createMany({
    data: [
      {
        subEventId: sub3.id,
        title: "Review and sanitize 60 trivia question slides",
        description: "Double check answer keys and slide animations.",
        priority: "HIGH",
        dueDate: parsePkt("2026-12-17", "11:00"),
        status: "IN_PROGRESS",
        assigneeId: student1.id,
      },
      {
        subEventId: sub3.id,
        title: "Test stage microphones and buzzer sensors",
        description: "Verify buzzer input reliability and audio volume.",
        priority: "MEDIUM",
        dueDate: parsePkt("2026-12-17", "12:30"),
        status: "TODO",
        assigneeId: null,
      },
    ],
  });

  // 7. Sub-event 4: Project Exhibition
  const sub4 = await prisma.subEvent.create({
    data: {
      megaEventId: mega.id,
      title: "Project Exhibition",
      description: "Showcase of final year capstone projects, robotics prototypes, and AI software innovations.",
      date: "2026-12-18",
      startAt: parsePkt("2026-12-18", "09:00"),
      endAt: parsePkt("2026-12-18", "16:00"),
      venue: "University Innovation Center",
      supervisorId: student1.id, // Student 1 supervises 2 sub-events
      allocatedBudget: 30000,
      budgetAlertSent: false,
    },
  });

  await prisma.task.createMany({
    data: [
      {
        subEventId: sub4.id,
        title: "Allocate 25 display booths and nameplates",
        description: "Position project posters and power supplies.",
        priority: "HIGH",
        dueDate: parsePkt("2026-12-18", "08:30"),
        status: "TODO",
        assigneeId: student2.id,
      },
      {
        subEventId: sub4.id,
        title: "Prepare judge scorecards and evaluation rubric folders",
        description: "Print and assemble scorecards for 5 industry evaluators.",
        priority: "MEDIUM",
        dueDate: parsePkt("2026-12-18", "09:00"),
        status: "TODO",
        assigneeId: student3.id,
      },
    ],
  });

  console.log(`   ✅ Seeded 4 Sub-events with tasks, budget allocations, and 80% alert on Sub-event 1!`);
  console.log("\n✨ Task 2 Demo Seed completed successfully!");
}

if (require.main === module) {
  seedTask2Demo()
    .catch((e) => {
      console.error("Error seeding Task 2 demo:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

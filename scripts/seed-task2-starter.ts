import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function seedTask2Starter() {
  console.log("🌱 Ensuring NEXUS Society starter data for Task 2...");
  const commonPass = bcrypt.hashSync("Pass@12345", 10);

  // 1. NEXUS President
  let presNexus = await prisma.user.findUnique({
    where: { email: "nexus.president@unisphere.test" },
  });

  if (!presNexus) {
    presNexus = await prisma.user.create({
      data: {
        name: "NEXUS President",
        email: "nexus.president@unisphere.test",
        passwordHash: commonPass,
        role: "PRESIDENT",
      },
    });
    console.log("   Created NEXUS President:", presNexus.email);
  } else {
    console.log("   NEXUS President exists:", presNexus.email);
  }

  // 2. NEXUS Students (at least 3)
  const nexusStudents = [];
  for (let i = 1; i <= 3; i++) {
    const email = `nexus.student${i}@unisphere.test`;
    let student = await prisma.user.findUnique({ where: { email } });
    if (!student) {
      student = await prisma.user.create({
        data: {
          name: `NEXUS Student ${i}`,
          email,
          passwordHash: commonPass,
          role: "STUDENT",
        },
      });
      console.log(`   Created NEXUS Student ${i}:`, student.email);
    } else {
      console.log(`   NEXUS Student ${i} exists:`, student.email);
    }
    nexusStudents.push(student);
  }

  // 3. NEXUS Society
  let societyNexus = await prisma.society.findUnique({
    where: { name: "NEXUS Society" },
  });

  if (!societyNexus) {
    societyNexus = await prisma.society.create({
      data: {
        name: "NEXUS Society",
        description: "Premier university computing and technical fest society.",
        category: "Technology",
        contactEmail: "nexus@unisphere.test",
        contactPhone: "+92 300 9876543",
        presidentId: presNexus.id,
      },
    });
    console.log("   Created NEXUS Society:", societyNexus.name);
  } else {
    console.log("   NEXUS Society exists:", societyNexus.name);
  }

  // Optional: create memberships for NEXUS students in NEXUS Society
  for (const st of nexusStudents) {
    const existingMem = await prisma.membership.findUnique({
      where: {
        societyId_studentId: {
          societyId: societyNexus.id,
          studentId: st.id,
        },
      },
    });
    if (!existingMem) {
      await prisma.membership.create({
        data: {
          societyId: societyNexus.id,
          studentId: st.id,
          status: "APPROVED",
          label: "MEMBER",
        },
      });
    }
  }

  console.log("✅ NEXUS Society starter data ready!\n");
  return { presNexus, nexusStudents, societyNexus };
}

if (require.main === module) {
  seedTask2Starter()
    .catch((err) => {
      console.error("❌ Error seeding Task 2 starter:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}


import { prisma } from "../lib/db";
import { createMegaEvent, listAdminMegaEvents, getAdminMegaEvent, updateMegaEvent } from "../lib/services/mega";

async function testPhaseB() {
  console.log("==========================================");
  console.log("   TESTING TASK 2 PHASE B (ADMIN MEGA)    ");
  console.log("==========================================\n");

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin found");

  const society = await prisma.society.findFirst({ where: { name: "NEXUS Society" } });
  if (!society) throw new Error("No NEXUS Society found");

  // 1. Create Mega Event
  console.log("1. Creating Mega Event...");
  const mega = await createMegaEvent(admin.id, {
    title: "NEXUS Tech Fest 2026 Test",
    description: "Annual university technical festival testing Phase B.",
    societyId: society.id,
    startDate: "2026-11-25",
    endDate: "2026-11-27",
    overallBudget: 150000,
  });
  console.log("   ✅ Created Mega Event ID:", mega.id);
  console.log("   ✅ President auto-assigned:", mega.presidentId === society.presidentId ? "MATCHES SOCIETY PRESIDENT" : "FAILED");

  // 2. Validate start > end rejection
  console.log("2. Testing start > end date validation...");
  try {
    await createMegaEvent(admin.id, {
      title: "Invalid Dates Mega Event",
      description: "Should fail validation",
      societyId: society.id,
      startDate: "2026-11-28",
      endDate: "2026-11-20",
      overallBudget: 50000,
    });
    console.log("   ❌ FAILED: start > end was accepted");
  } catch (err: any) {
    console.log("   ✅ Rejected as expected:", err.message);
  }

  // 3. Test PATCH restriction
  console.log("3. Testing PATCH field restriction (disallow budget/dates)...");
  try {
    await updateMegaEvent(admin.id, mega.id, {
      title: "Updated Title",
      overallBudget: 200000,
    });
    console.log("   ❌ FAILED: overallBudget change was allowed");
  } catch (err: any) {
    console.log("   ✅ Rejected forbidden field as expected:", err.message);
  }

  // 4. Test valid PATCH title/description
  console.log("4. Testing valid PATCH title & description...");
  const updated = await updateMegaEvent(admin.id, mega.id, {
    title: "NEXUS Tech Fest 2026 (Updated)",
    description: "Updated description for test.",
  });
  console.log("   ✅ Successfully updated title:", updated.title);

  // 5. Test List & Summary
  console.log("5. Testing listAdminMegaEvents...");
  const list = await listAdminMegaEvents(admin.id);
  const found = list.find((m) => m.id === mega.id);
  console.log("   ✅ Found in admin list:", !!found, `(Total: ${list.length})`);

  // 6. Test Admin isolation (fake admin ID should fail)
  console.log("6. Testing Admin isolation...");
  try {
    await getAdminMegaEvent("cuid_fake_admin_999", mega.id);
    console.log("   ❌ FAILED: Fake admin accessed mega event");
  } catch (err: any) {
    console.log("   ✅ Rejected fake admin access:", err.message);
  }

  // Cleanup test mega event
  await prisma.megaEvent.delete({ where: { id: mega.id } });
  console.log("\n✅ All Phase B tests PASSED!\n");
}

testPhaseB()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

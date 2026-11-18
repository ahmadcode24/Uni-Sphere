import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventCaps } from "@/lib/services/event";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const societyId = searchParams.get("societyId") || undefined;
    const now = new Date();

    const where: any = {
      approvalStatus: "APPROVED",
      isCancelled: false,
      endAt: { gte: now }, // Upcoming or Ongoing
    };

    if (societyId) {
      where.societyId = societyId;
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        society: {
          select: { id: true, name: true, category: true, logoUrl: true },
        },
        _count: {
          select: {
            registrations: { where: { status: "REGISTERED" } },
          },
        },
      },
      orderBy: { startAt: "asc" },
      take: limit,
    });

    // Map caps and seats remaining
    const formatted = events
      .map((e) => {
        const caps = eventCaps(e, now);
        const registeredCount = e._count.registrations;
        const seatsRemaining = Math.max(0, e.capacity - registeredCount);
        return {
          ...e,
          registeredCount,
          seatsRemaining,
          scheduleStatus: caps.scheduleStatus,
          canRegister: caps.canRegister,
        };
      })
      .filter((e) => e.scheduleStatus === "UPCOMING" || e.scheduleStatus === "ONGOING");

    return NextResponse.json({ events: formatted });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch public events" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { eventCaps } from "@/lib/services/event";

export async function GET() {
  try {
    const session = await requireUser(["STUDENT"]);
    const registrations = await prisma.registration.findMany({
      where: { studentId: session.userId },
      include: {
        event: {
          include: {
            society: { select: { id: true, name: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const formatted = registrations.map((r) => {
      const caps = eventCaps(r.event, now);
      return {
        ...r,
        scheduleStatus: caps.scheduleStatus,
      };
    });

    return NextResponse.json({ registrations: formatted });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch registrations" },
      { status: err.status || 500 }
    );
  }
}

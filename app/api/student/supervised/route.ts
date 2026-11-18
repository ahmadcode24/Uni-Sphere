import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subEvents = await prisma.subEvent.findMany({
      where: { supervisorId: session.userId },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        startAt: true,
        endAt: true,
        venue: true,
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
            status: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    const sanitized = subEvents.map((sub) => {
      const totalTasks = sub.tasks.length;
      const completedTasks = sub.tasks.filter((t) => t.status === "COMPLETED").length;
      const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      return {
        id: sub.id,
        title: sub.title,
        description: sub.description,
        date: sub.date,
        startAt: sub.startAt,
        endAt: sub.endAt,
        venue: sub.venue,
        megaEvent: sub.megaEvent,
        totalTasks,
        completedTasks,
        progressPercent,
      };
    });

    return NextResponse.json({ subEvents: sanitized });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: err.message || "Failed to load supervised sub-events" }, { status: 500 });
  }
}

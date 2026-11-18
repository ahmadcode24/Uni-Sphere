import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subEvent = await prisma.subEvent.findUnique({
      where: { id: params.id },
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
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { dueDate: "asc" },
        },
      },
    });

    if (!subEvent || subEvent.supervisorId !== session.userId) {
      return NextResponse.json(
        { error: "You are not the designated supervisor of this sub-event." },
        { status: 403 }
      );
    }

    const totalTasks = subEvent.tasks.length;
    const completedTasks = subEvent.tasks.filter((t) => t.status === "COMPLETED").length;
    const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return NextResponse.json({
      subEvent: {
        ...subEvent,
        totalTasks,
        completedTasks,
        progressPercent,
      },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: err.message || "Failed to load sub-event" }, { status: 500 });
  }
}

import { prisma } from "../db";
import { AppError } from "../errors";
import { notify } from "../notify";
import { DateTime } from "luxon";
import { z } from "zod";

const ZONE = "Asia/Karachi";
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const CreateSubEventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(120),
  description: z.string().min(5, "Description must be at least 5 characters"),
  date: z.string().regex(DATE_REGEX, "Date must be YYYY-MM-DD"),
  startTime: z.string().regex(TIME_REGEX, "Start time must be HH:mm"),
  endTime: z.string().regex(TIME_REGEX, "End time must be HH:mm"),
  venue: z.string().min(2, "Venue is required"),
  supervisorId: z.string().min(1, "Supervisor is required"),
});

export const UpdateSubEventSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().min(5).optional(),
  date: z.string().regex(DATE_REGEX).optional(),
  startTime: z.string().regex(TIME_REGEX).optional(),
  endTime: z.string().regex(TIME_REGEX).optional(),
  venue: z.string().min(2).optional(),
  supervisorId: z.string().min(1).optional(),
});

export async function listPresidentMegaEvents(presidentId: string) {
  const megaEvents = await prisma.megaEvent.findMany({
    where: { presidentId },
    include: {
      society: { select: { id: true, name: true, category: true } },
      subEvents: {
        include: {
          supervisor: { select: { id: true, name: true, email: true } },
          tasks: { select: { id: true, status: true } },
          expenses: { select: { id: true, amount: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return megaEvents.map((m) => {
    let totalTasks = 0;
    let completedTasks = 0;
    let totalAllocated = 0;
    let totalSpent = 0;

    for (const sub of m.subEvents) {
      if (sub.allocatedBudget !== null) totalAllocated += sub.allocatedBudget;
      for (const t of sub.tasks) {
        totalTasks += 1;
        if (t.status === "COMPLETED") completedTasks += 1;
      }
      for (const exp of sub.expenses) {
        totalSpent += exp.amount;
      }
    }

    const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    const unallocated = Math.max(0, m.overallBudget - totalAllocated);

    return {
      id: m.id,
      title: m.title,
      description: m.description,
      society: m.society,
      startDate: m.startDate,
      endDate: m.endDate,
      overallBudget: m.overallBudget,
      subEventCount: m.subEvents.length,
      totalTasks,
      completedTasks,
      progressPercent,
      totalAllocated,
      unallocated,
      totalSpent,
      createdAt: m.createdAt,
    };
  });
}

export async function getPresidentMegaEvent(presidentId: string, id: string) {
  const mega = await prisma.megaEvent.findUnique({
    where: { id },
    include: {
      society: { select: { id: true, name: true, category: true } },
      subEvents: {
        include: {
          supervisor: { select: { id: true, name: true, email: true } },
          tasks: {
            include: {
              assignee: { select: { id: true, name: true, email: true } },
            },
            orderBy: { dueDate: "asc" },
          },
          expenses: {
            orderBy: { spentOn: "desc" },
          },
        },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!mega || mega.presidentId !== presidentId) {
    throw new AppError("NOT_FOUND", "Mega Event not found.", 404);
  }

  let totalTasks = 0;
  let completedTasks = 0;
  let totalAllocated = 0;
  let totalSpent = 0;

  const subEvents = mega.subEvents.map((sub) => {
    const subTotalTasks = sub.tasks.length;
    const subCompletedTasks = sub.tasks.filter((t) => t.status === "COMPLETED").length;
    const subProgress = subTotalTasks === 0 ? 0 : Math.round((subCompletedTasks / subTotalTasks) * 100);
    const subSpent = sub.expenses.reduce((acc, e) => acc + e.amount, 0);

    totalTasks += subTotalTasks;
    completedTasks += subCompletedTasks;
    if (sub.allocatedBudget !== null) totalAllocated += sub.allocatedBudget;
    totalSpent += subSpent;

    return {
      ...sub,
      totalTasks: subTotalTasks,
      completedTasks: subCompletedTasks,
      progressPercent: subProgress,
      spent: subSpent,
      remaining: (sub.allocatedBudget ?? 0) - subSpent,
    };
  });

  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const unallocated = Math.max(0, mega.overallBudget - totalAllocated);

  return {
    ...mega,
    subEvents,
    totalTasks,
    completedTasks,
    progressPercent,
    totalAllocated,
    unallocated,
    totalSpent,
  };
}

export async function createSubEvent(
  presidentId: string,
  megaEventId: string,
  rawInput: z.infer<typeof CreateSubEventSchema>
) {
  const mega = await prisma.megaEvent.findUnique({ where: { id: megaEventId } });
  if (!mega || mega.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "You do not own this Mega Event.", 403);
  }

  const parsed = CreateSubEventSchema.parse(rawInput);

  // Validate date is within Mega Event range inclusive
  if (parsed.date < mega.startDate || parsed.date > mega.endDate) {
    throw new AppError(
      "INVALID_DATE",
      `Sub-event date (${parsed.date}) must be within the festival range [${mega.startDate} to ${mega.endDate}].`,
      400
    );
  }

  // Validate startTime < endTime on same date
  if (parsed.startTime >= parsed.endTime) {
    throw new AppError("INVALID_TIME", "Sub-event start time must be before end time.", 400);
  }

  // Validate supervisor exists and is STUDENT
  const supervisor = await prisma.user.findUnique({ where: { id: parsed.supervisorId } });
  if (!supervisor || supervisor.role !== "STUDENT") {
    throw new AppError("INVALID_SUPERVISOR", "Supervisor must be a registered student.", 400);
  }

  // Convert PKT times to UTC Date objects
  const startAt = DateTime.fromISO(`${parsed.date}T${parsed.startTime}:00`, { zone: ZONE }).toUTC().toJSDate();
  const endAt = DateTime.fromISO(`${parsed.date}T${parsed.endTime}:00`, { zone: ZONE }).toUTC().toJSDate();

  const subEvent = await prisma.subEvent.create({
    data: {
      megaEventId,
      title: parsed.title.trim(),
      description: parsed.description.trim(),
      date: parsed.date,
      startAt,
      endAt,
      venue: parsed.venue.trim(),
      supervisorId: parsed.supervisorId,
    },
    include: {
      supervisor: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify assigned supervisor
  await notify(parsed.supervisorId, {
    type: "SUPERVISOR_ASSIGNED",
    message: `You have been appointed as supervisor for sub-event '${subEvent.title}' in '${mega.title}'.`,
    link: `/student/supervised/${subEvent.id}`,
  });

  return subEvent;
}

export async function updateSubEvent(
  presidentId: string,
  subEventId: string,
  rawInput: z.infer<typeof UpdateSubEventSchema>
) {
  const subEvent = await prisma.subEvent.findUnique({
    where: { id: subEventId },
    include: { megaEvent: true },
  });

  if (!subEvent || subEvent.megaEvent.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "You do not own this sub-event.", 403);
  }

  const parsed = UpdateSubEventSchema.parse(rawInput);
  const mega = subEvent.megaEvent;

  const newDate = parsed.date ?? subEvent.date;
  if (newDate < mega.startDate || newDate > mega.endDate) {
    throw new AppError(
      "INVALID_DATE",
      `Sub-event date (${newDate}) must be within the festival range [${mega.startDate} to ${mega.endDate}].`,
      400
    );
  }

  // Current or new start/end times in PKT
  let currentStartTime = DateTime.fromJSDate(subEvent.startAt).setZone(ZONE).toFormat("HH:mm");
  let currentEndTime = DateTime.fromJSDate(subEvent.endAt).setZone(ZONE).toFormat("HH:mm");

  const finalStartTime = parsed.startTime ?? currentStartTime;
  const finalEndTime = parsed.endTime ?? currentEndTime;

  if (finalStartTime >= finalEndTime) {
    throw new AppError("INVALID_TIME", "Sub-event start time must be before end time.", 400);
  }

  const startAt = DateTime.fromISO(`${newDate}T${finalStartTime}:00`, { zone: ZONE }).toUTC().toJSDate();
  const endAt = DateTime.fromISO(`${newDate}T${finalEndTime}:00`, { zone: ZONE }).toUTC().toJSDate();

  let oldSupervisorId = subEvent.supervisorId;
  let newSupervisorId = parsed.supervisorId ?? subEvent.supervisorId;

  if (parsed.supervisorId && parsed.supervisorId !== oldSupervisorId) {
    const supervisor = await prisma.user.findUnique({ where: { id: parsed.supervisorId } });
    if (!supervisor || supervisor.role !== "STUDENT") {
      throw new AppError("INVALID_SUPERVISOR", "Supervisor must be a registered student.", 400);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.subEvent.update({
      where: { id: subEventId },
      data: {
        title: parsed.title ? parsed.title.trim() : undefined,
        description: parsed.description ? parsed.description.trim() : undefined,
        date: newDate,
        startAt,
        endAt,
        venue: parsed.venue ? parsed.venue.trim() : undefined,
        supervisorId: newSupervisorId,
      },
      include: {
        supervisor: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify old supervisor if reassigned
    if (parsed.supervisorId && parsed.supervisorId !== oldSupervisorId) {
      await notify(oldSupervisorId, {
        type: "SUPERVISOR_REVOKED",
        message: `You are no longer supervisor of sub-event '${subEvent.title}'.`,
      });

      // Notify new supervisor
      await notify(newSupervisorId, {
        type: "SUPERVISOR_ASSIGNED",
        message: `You have been appointed as supervisor for sub-event '${res.title}' in '${mega.title}'.`,
        link: `/student/supervised/${res.id}`,
      });
    }

    return res;
  });

  return updated;
}

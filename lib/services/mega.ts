import { prisma } from "../db";
import { AppError } from "../errors";
import { notify } from "../notify";
import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const CreateMegaEventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(120),
  description: z.string().min(5, "Description must be at least 5 characters"),
  societyId: z.string().min(1, "Society selection is required"),
  startDate: z.string().regex(DATE_REGEX, "Start date must be YYYY-MM-DD"),
  endDate: z.string().regex(DATE_REGEX, "End date must be YYYY-MM-DD"),
  overallBudget: z.number().int().min(0, "Overall budget must be a non-negative integer"),
});

export const UpdateMegaEventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(120).optional(),
  description: z.string().min(5, "Description must be at least 5 characters").optional(),
});

export async function createMegaEvent(
  adminId: string,
  rawInput: z.infer<typeof CreateMegaEventSchema>
) {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "Only administrators can create Mega Events.", 403);
  }

  const parsed = CreateMegaEventSchema.parse(rawInput);

  if (parsed.startDate > parsed.endDate) {
    throw new AppError("INVALID_DATES", "Start date must be less than or equal to end date.", 400);
  }

  const society = await prisma.society.findUnique({
    where: { id: parsed.societyId },
    include: { president: true },
  });

  if (!society) {
    throw new AppError("SOCIETY_NOT_FOUND", "Selected society does not exist.", 404);
  }

  // Automatic server-side assignment of presidentId from society.presidentId
  const megaEvent = await prisma.megaEvent.create({
    data: {
      title: parsed.title.trim(),
      description: parsed.description.trim(),
      societyId: society.id,
      presidentId: society.presidentId,
      createdById: adminId,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      overallBudget: parsed.overallBudget,
    },
    include: {
      society: { select: { id: true, name: true } },
      president: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify assigned President
  await notify(society.presidentId, {
    type: "MEGA_EVENT_CREATED",
    message: `A new Mega Event '${megaEvent.title}' has been officially assigned to your society.`,
    link: `/president/mega-events/${megaEvent.id}`,
  });

  return megaEvent;
}

export async function listAdminMegaEvents(adminId: string) {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "Only administrators can view admin Mega Events.", 403);
  }

  const megaEvents = await prisma.megaEvent.findMany({
    where: { createdById: adminId },
    include: {
      society: { select: { id: true, name: true } },
      president: { select: { id: true, name: true, email: true } },
      subEvents: {
        select: {
          id: true,
          allocatedBudget: true,
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
      if (sub.allocatedBudget !== null) {
        totalAllocated += sub.allocatedBudget;
      }
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
      president: m.president,
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

export async function getAdminMegaEvent(adminId: string, id: string) {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "Only administrators can view admin Mega Events.", 403);
  }

  const megaEvent = await prisma.megaEvent.findUnique({
    where: { id },
    include: {
      society: { select: { id: true, name: true } },
      president: { select: { id: true, name: true, email: true } },
      subEvents: {
        include: {
          supervisor: { select: { id: true, name: true, email: true } },
          tasks: { select: { id: true, status: true } },
          expenses: { select: { id: true, amount: true } },
        },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!megaEvent || megaEvent.createdById !== adminId) {
    throw new AppError("NOT_FOUND", "Mega Event not found.", 404);
  }

  let totalTasks = 0;
  let completedTasks = 0;
  let totalAllocated = 0;
  let totalSpent = 0;

  const subEventsSummary = megaEvent.subEvents.map((sub) => {
    const subTotalTasks = sub.tasks.length;
    const subCompletedTasks = sub.tasks.filter((t) => t.status === "COMPLETED").length;
    const subProgress = subTotalTasks === 0 ? 0 : Math.round((subCompletedTasks / subTotalTasks) * 100);
    const subSpent = sub.expenses.reduce((acc, e) => acc + e.amount, 0);

    totalTasks += subTotalTasks;
    completedTasks += subCompletedTasks;
    if (sub.allocatedBudget !== null) totalAllocated += sub.allocatedBudget;
    totalSpent += subSpent;

    return {
      id: sub.id,
      title: sub.title,
      description: sub.description,
      date: sub.date,
      startAt: sub.startAt,
      endAt: sub.endAt,
      venue: sub.venue,
      supervisor: sub.supervisor,
      allocatedBudget: sub.allocatedBudget,
      spent: subSpent,
      remaining: (sub.allocatedBudget ?? 0) - subSpent,
      totalTasks: subTotalTasks,
      completedTasks: subCompletedTasks,
      progressPercent: subProgress,
    };
  });

  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const unallocated = Math.max(0, megaEvent.overallBudget - totalAllocated);

  return {
    ...megaEvent,
    subEvents: subEventsSummary,
    totalTasks,
    completedTasks,
    progressPercent,
    totalAllocated,
    unallocated,
    totalSpent,
  };
}

export async function updateMegaEvent(
  adminId: string,
  id: string,
  body: Record<string, any>
) {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "Only administrators can update Mega Events.", 403);
  }

  // Reject any unauthorized keys
  const disallowedKeys = ["societyId", "presidentId", "startDate", "endDate", "overallBudget", "createdById"];
  for (const k of disallowedKeys) {
    if (k in body) {
      throw new AppError("BAD_REQUEST", `Updating field '${k}' is not permitted. Only title and description can be updated.`, 400);
    }
  }

  const parsed = UpdateMegaEventSchema.parse(body);

  const existing = await prisma.megaEvent.findUnique({ where: { id } });
  if (!existing || existing.createdById !== adminId) {
    throw new AppError("NOT_FOUND", "Mega Event not found.", 404);
  }

  const updated = await prisma.megaEvent.update({
    where: { id },
    data: {
      title: parsed.title ? parsed.title.trim() : undefined,
      description: parsed.description ? parsed.description.trim() : undefined,
    },
    include: {
      society: { select: { id: true, name: true } },
      president: { select: { id: true, name: true, email: true } },
    },
  });

  return updated;
}


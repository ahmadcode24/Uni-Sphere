import { prisma } from "../db";
import { AppError } from "../errors";

export interface SubEventMetrics {
  id: string;
  title: string;
  date: string;
  supervisorName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  completionPercent: number;
  allocatedBudget: number | null;
  spent: number;
  remaining: number;
  percentUsed: number;
  budgetAlertSent: boolean;
}

export interface MegaEventMetrics {
  megaEventId: string;
  title: string;
  societyName: string;
  startDate: string;
  endDate: string;
  overallBudget: number;
  totalAllocated: number;
  unallocated: number;
  totalSpent: number;
  remaining: number;
  overallCompletionPercent: number;
  totalTasks: number;
  completedTasks: number;
  unassignedTasks: number;
  overdueTasks: number;
  subEvents: SubEventMetrics[];
}

export async function buildMegaMetrics(megaEventId: string, presidentId: string): Promise<MegaEventMetrics> {
  const mega = await prisma.megaEvent.findUnique({
    where: { id: megaEventId },
    include: {
      society: { select: { id: true, name: true } },
      subEvents: {
        include: {
          supervisor: { select: { id: true, name: true, email: true } },
          tasks: true,
          expenses: true,
        },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!mega) {
    throw new AppError("NOT_FOUND", "Mega Event not found.", 404);
  }

  if (mega.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "Only the assigned society president can access operations metrics.", 403);
  }

  const now = new Date();
  let totalTasks = 0;
  let completedTasks = 0;
  let unassignedTasks = 0;
  let overdueTasks = 0;
  let totalAllocated = 0;
  let totalSpent = 0;

  const subEvents: SubEventMetrics[] = mega.subEvents.map((sub) => {
    const sTotalTasks = sub.tasks.length;
    const sCompleted = sub.tasks.filter((t) => t.status === "COMPLETED").length;
    const sInProgress = sub.tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const sTodo = sub.tasks.filter((t) => t.status === "TODO").length;
    const sCompletionPercent = sTotalTasks === 0 ? 0 : Math.round((sCompleted / sTotalTasks) * 100);

    const sSpent = sub.expenses.reduce((sum, e) => sum + e.amount, 0);
    const sAllocated = sub.allocatedBudget;
    const sRemaining = (sAllocated ?? 0) - sSpent;
    const sPercentUsed = sAllocated && sAllocated > 0 ? Math.round((sSpent / sAllocated) * 100) : 0;

    totalTasks += sTotalTasks;
    completedTasks += sCompleted;
    if (sAllocated !== null) totalAllocated += sAllocated;
    totalSpent += sSpent;

    for (const t of sub.tasks) {
      if (!t.assigneeId) unassignedTasks += 1;
      if (t.status !== "COMPLETED" && t.dueDate < now) overdueTasks += 1;
    }

    return {
      id: sub.id,
      title: sub.title,
      date: sub.date,
      supervisorName: sub.supervisor.name,
      totalTasks: sTotalTasks,
      completedTasks: sCompleted,
      inProgressTasks: sInProgress,
      todoTasks: sTodo,
      completionPercent: sCompletionPercent,
      allocatedBudget: sAllocated,
      spent: sSpent,
      remaining: sRemaining,
      percentUsed: sPercentUsed,
      budgetAlertSent: sub.budgetAlertSent,
    };
  });

  const overallCompletionPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const unallocated = Math.max(0, mega.overallBudget - totalAllocated);
  const remaining = mega.overallBudget - totalSpent;

  return {
    megaEventId: mega.id,
    title: mega.title,
    societyName: mega.society.name,
    startDate: mega.startDate,
    endDate: mega.endDate,
    overallBudget: mega.overallBudget,
    totalAllocated,
    unallocated,
    totalSpent,
    remaining,
    overallCompletionPercent,
    totalTasks,
    completedTasks,
    unassignedTasks,
    overdueTasks,
    subEvents,
  };
}

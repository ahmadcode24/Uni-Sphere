import { prisma } from "../db";
import { AppError } from "../errors";

export async function getEventExpenses(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      approvalStatus: true,
      isCancelled: true,
      approvedBudget: true,
      proposedBudget: true,
    },
  });

  if (!event) throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);

  const expenses = await prisma.expense.findMany({
    where: { eventId },
    orderBy: { spentOn: "desc" },
  });

  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const budgetCap = event.approvedBudget ?? 0;
  const remaining = budgetCap - totalSpent;
  const isOverBudget = remaining < 0;

  return {
    event,
    expenses,
    approvedBudget: budgetCap,
    totalSpent,
    remaining,
    isOverBudget,
  };
}

export async function addExpense(
  presidentId: string,
  eventId: string,
  data: {
    title: string;
    amount: number;
    note?: string | null;
    spentOn: Date;
  }
) {
  if (data.amount <= 0) {
    throw new AppError("INVALID_AMOUNT", "Expense amount must be an integer > 0.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      include: { society: true },
    });

    if (!event) throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);
    if (event.society.presidentId !== presidentId) {
      throw new AppError("FORBIDDEN", "Unauthorized to log expenses for this event.", 403);
    }

    if (event.approvalStatus !== "APPROVED" || event.isCancelled) {
      throw new AppError(
        "BUDGET_NOT_APPROVED",
        "Expenses can only be recorded for Approved, non-cancelled events.",
        400
      );
    }

    const budgetCap = event.approvedBudget || 0;
    const currentExpenses = await tx.expense.findMany({ where: { eventId } });
    const currentSpent = currentExpenses.reduce((sum, e) => sum + e.amount, 0);

    if (currentSpent > budgetCap) {
      throw new AppError(
        "OVER_BUDGET_LOCKED",
        "Total expenses already exceed the approved budget. All new expenses are locked.",
        400
      );
    }

    if (currentSpent + data.amount > budgetCap) {
      const remainingAllowed = Math.max(0, budgetCap - currentSpent);
      throw new AppError(
        "EXCEEDS_BUDGET",
        `This expense of Rs ${data.amount.toLocaleString()} exceeds the remaining approved budget of Rs ${remainingAllowed.toLocaleString()}.`,
        400
      );
    }

    return tx.expense.create({
      data: {
        eventId,
        title: data.title.trim(),
        amount: Math.round(data.amount),
        note: data.note ? data.note.trim() : null,
        spentOn: data.spentOn,
      },
    });
  });
}

export async function updateExpense(
  presidentId: string,
  expenseId: string,
  data: {
    title?: string;
    amount?: number;
    note?: string | null;
    spentOn?: Date;
  }
) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({
      where: { id: expenseId },
      include: { event: { include: { society: true } } },
    });

    if (!expense) throw new AppError("NOT_FOUND", "Expense record not found", 404);
    if (expense.event.society.presidentId !== presidentId) {
      throw new AppError("FORBIDDEN", "Unauthorized to update this expense.", 403);
    }

    if (expense.event.approvalStatus !== "APPROVED" || expense.event.isCancelled) {
      throw new AppError(
        "EVENT_NOT_APPROVED",
        "Expenses can only be updated for Approved, non-cancelled events.",
        400
      );
    }

    const budgetCap = expense.event.approvedBudget || 0;

    if (data.amount !== undefined) {
      if (data.amount <= 0) {
        throw new AppError("INVALID_AMOUNT", "Expense amount must be > 0.", 400);
      }

      const allExpenses = await tx.expense.findMany({
        where: { eventId: expense.eventId },
      });
      const spentOthers = allExpenses
        .filter((e) => e.id !== expenseId)
        .reduce((sum, e) => sum + e.amount, 0);

      if (spentOthers + data.amount > budgetCap) {
        throw new AppError(
          "EXCEEDS_BUDGET",
          `Updated amount exceeds the approved budget cap of Rs ${budgetCap.toLocaleString()}.`,
          400
        );
      }
    }

    return tx.expense.update({
      where: { id: expenseId },
      data: {
        title: data.title ? data.title.trim() : undefined,
        amount: data.amount ? Math.round(data.amount) : undefined,
        note: data.note !== undefined ? (data.note ? data.note.trim() : null) : undefined,
        spentOn: data.spentOn,
      },
    });
  });
}

export async function deleteExpense(presidentId: string, expenseId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { event: { include: { society: true } } },
  });

  if (!expense) throw new AppError("NOT_FOUND", "Expense not found", 404);
  if (expense.event.society.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "Unauthorized to delete this expense.", 403);
  }

  await prisma.expense.delete({ where: { id: expenseId } });
  return { success: true };
}


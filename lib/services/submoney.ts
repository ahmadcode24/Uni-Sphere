import { prisma } from "../db";
import { AppError } from "../errors";
import { notify } from "../notify";
import { z } from "zod";

export const AllocateBudgetSchema = z.object({
  amount: z.number().int().min(0, "Allocation amount must be a non-negative integer"),
});

export const AddSubExpenseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(120),
  amount: z.number().int().min(1, "Expense amount must be a positive integer"),
  note: z.string().optional().nullable(),
  spentOn: z.union([z.string().min(1), z.date()]),
});

export async function allocateSubEventBudget(
  presidentId: string,
  subEventId: string,
  rawAmount: number
) {
  const parsed = AllocateBudgetSchema.parse({ amount: rawAmount });
  const amount = parsed.amount;

  return prisma.$transaction(async (tx) => {
    // 1. Fetch subEvent to get megaEventId
    const subEvent = await tx.subEvent.findUnique({
      where: { id: subEventId },
      include: { megaEvent: true },
    });

    if (!subEvent || subEvent.megaEvent.presidentId !== presidentId) {
      throw new AppError("FORBIDDEN", "Unauthorized to allocate budget for this sub-event.", 403);
    }

    // 2. Row lock on MegaEvent to prevent concurrent over-allocation
    await tx.$queryRaw`SELECT id FROM "MegaEvent" WHERE id = ${subEvent.megaEventId} FOR UPDATE`;

    const mega = await tx.megaEvent.findUnique({
      where: { id: subEvent.megaEventId },
      include: {
        subEvents: {
          select: { id: true, allocatedBudget: true },
        },
      },
    });

    if (!mega) {
      throw new AppError("NOT_FOUND", "Mega Event not found.", 404);
    }

    // 3. Allocation is strictly once per sub-event
    if (subEvent.allocatedBudget !== null) {
      throw new AppError("CONFLICT", "Budget allocation for this sub-event has already been set and cannot be modified.", 409);
    }

    // 4. Sum other allocations
    const otherAllocations = mega.subEvents
      .filter((s) => s.id !== subEventId && s.allocatedBudget !== null)
      .reduce((sum, s) => sum + (s.allocatedBudget || 0), 0);

    const unallocated = mega.overallBudget - otherAllocations;

    if (otherAllocations + amount > mega.overallBudget) {
      throw new AppError(
        "OVERALL_BUDGET_EXCEEDED",
        `Exceeds overall budget. Unallocated: Rs ${unallocated.toLocaleString()} PKR`,
        409
      );
    }

    // 5. Set allocatedBudget
    const updated = await tx.subEvent.update({
      where: { id: subEventId },
      data: { allocatedBudget: amount },
    });

    return updated;
  });
}

export async function addSubEventExpense(
  presidentId: string,
  subEventId: string,
  rawInput: z.infer<typeof AddSubExpenseSchema>
) {
  const parsed = AddSubExpenseSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    // 1. Row lock on SubEvent
    await tx.$queryRaw`SELECT id FROM "SubEvent" WHERE id = ${subEventId} FOR UPDATE`;

    const subEvent = await tx.subEvent.findUnique({
      where: { id: subEventId },
      include: {
        megaEvent: true,
        expenses: { select: { id: true, amount: true } },
      },
    });

    if (!subEvent || subEvent.megaEvent.presidentId !== presidentId) {
      throw new AppError("FORBIDDEN", "Unauthorized to record expenses for this sub-event.", 403);
    }

    // 2. Budget must be allocated before logging expenses
    if (subEvent.allocatedBudget === null) {
      throw new AppError(
        "ALLOCATION_REQUIRED",
        "Cannot record expenses before budget is allocated to this sub-event.",
        409
      );
    }

    // 3. Check remaining cap
    const currentSpent = subEvent.expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = subEvent.allocatedBudget - currentSpent;

    if (currentSpent + parsed.amount > subEvent.allocatedBudget) {
      throw new AppError(
        "BUDGET_CAP_EXCEEDED",
        `Expense exceeds sub-event budget cap. Remaining: Rs ${remaining.toLocaleString()} PKR`,
        409
      );
    }

    // 4. Invariant: exactly one of eventId/subEventId set
    const expense = await tx.expense.create({
      data: {
        subEventId,
        eventId: null,
        title: parsed.title.trim(),
        amount: parsed.amount,
        note: parsed.note ? parsed.note.trim() : null,
        spentOn: new Date(parsed.spentOn),
      },
    });

    const newSpent = currentSpent + parsed.amount;

    // 5. 80% Alert Rule:
    // If allocated > 0 AND newSpent * 5 >= allocated * 4 AND !budgetAlertSent:
    // trigger 1 notification and set budgetAlertSent = true in SAME transaction
    if (
      subEvent.allocatedBudget > 0 &&
      newSpent * 5 >= subEvent.allocatedBudget * 4 &&
      !subEvent.budgetAlertSent
    ) {
      await tx.subEvent.update({
        where: { id: subEventId },
        data: { budgetAlertSent: true },
      });

      await notify(presidentId, {
        type: "BUDGET_ALERT",
        message: `'${subEvent.title}' has reached 80% of its budget (Spent: Rs ${newSpent.toLocaleString()} / Rs ${subEvent.allocatedBudget.toLocaleString()} PKR).`,
        link: `/president/mega-events/${subEvent.megaEventId}`,
      });
    }

    return expense;
  });
}

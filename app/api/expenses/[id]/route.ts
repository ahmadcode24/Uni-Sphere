import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { updateExpense, deleteExpense } from "@/lib/services/expense";
import { fromPKTInput } from "@/lib/time";

const updateExpenseSchema = z.object({
  title: z.string().min(2).optional(),
  amount: z.coerce.number().int().min(1).optional(),
  note: z.string().optional().nullable(),
  spentOn: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    const body = await req.json();

    const parseResult = updateExpenseSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const d = parseResult.data;
    const updatePayload: any = {};
    if (d.title) updatePayload.title = d.title;
    if (d.amount !== undefined) updatePayload.amount = d.amount;
    if (d.note !== undefined) updatePayload.note = d.note;
    if (d.spentOn) updatePayload.spentOn = fromPKTInput(d.spentOn);

    const expense = await updateExpense(session.userId, params.id, updatePayload);
    return NextResponse.json({ success: true, expense });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update expense" },
      { status: err.status || 400 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    await deleteExpense(session.userId, params.id);
    return NextResponse.json({ success: true, message: "Expense deleted." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete expense" },
      { status: err.status || 400 }
    );
  }
}


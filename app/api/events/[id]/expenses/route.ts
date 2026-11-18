export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getEventExpenses, addExpense } from "@/lib/services/expense";
import { fromPKTInput } from "@/lib/time";

const addExpenseSchema = z.object({
  title: z.string().min(2, "Title is required"),
  amount: z.coerce.number().int().min(1, "Amount must be > 0"),
  note: z.string().optional().nullable(),
  spentOn: z.string().min(1, "Date is required"),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const data = await getEventExpenses(params.id);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch expenses" },
      { status: err.status || 500 }
    );
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    const body = await req.json();

    const parseResult = addExpenseSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid expense data" },
        { status: 400 }
      );
    }

    const d = parseResult.data;
    const spentOn = fromPKTInput(d.spentOn);

    const expense = await addExpense(session.userId, params.id, {
      title: d.title,
      amount: d.amount,
      note: d.note,
      spentOn,
    });

    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to record expense" },
      { status: err.status || 400 }
    );
  }
}


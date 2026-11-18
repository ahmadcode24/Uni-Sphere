import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addSubEventExpense } from "@/lib/services/submoney";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PRESIDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subEvent = await prisma.subEvent.findUnique({
      where: { id: params.id },
      include: {
        megaEvent: true,
        expenses: { orderBy: { spentOn: "desc" } },
      },
    });

    if (!subEvent || subEvent.megaEvent.presidentId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ expenses: subEvent.expenses });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: err.message || "Failed to load expenses" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PRESIDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const expense = await addSubEventExpense(session.userId, params.id, body);
    return NextResponse.json({ expense }, { status: 201 });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: err.message || "Failed to add expense" }, { status: 400 });
  }
}

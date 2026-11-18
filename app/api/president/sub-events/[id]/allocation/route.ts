import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { allocateSubEventBudget } from "@/lib/services/submoney";
import { AppError } from "@/lib/errors";

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
    const updated = await allocateSubEventBudget(session.id, params.id, Number(body.amount));
    return NextResponse.json({ subEvent: updated });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || "Failed to allocate budget" }, { status: 400 });
  }
}

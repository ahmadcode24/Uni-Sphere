import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSubEventTask } from "@/lib/services/subtask";
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
    const task = await createSubEventTask(session.id, params.id, body);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || "Failed to create task" }, { status: 400 });
  }
}

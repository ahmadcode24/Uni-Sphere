import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateSubEventTaskStatus } from "@/lib/services/subtask";
import { AppError } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const status = body.status;

    if (!["TODO", "IN_PROGRESS", "COMPLETED"].includes(status)) {
      return NextResponse.json({ error: "Invalid task status." }, { status: 400 });
    }

    const task = await updateSubEventTaskStatus(session.userId, session.role, params.id, status);
    return NextResponse.json({ task });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: err.message || "Failed to update task status" }, { status: 400 });
  }
}

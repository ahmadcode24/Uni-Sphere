import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { updateTask, deleteTask } from "@/lib/services/task";
import { fromPKTInput } from "@/lib/time";

const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED"]).optional(),
  assigneeId: z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser();
    const body = await req.json();

    const parseResult = updateTaskSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const d = parseResult.data;
    const updatePayload: any = {};
    if (d.title) updatePayload.title = d.title;
    if (d.description) updatePayload.description = d.description;
    if (d.priority) updatePayload.priority = d.priority;
    if (d.dueDate) updatePayload.dueDate = fromPKTInput(d.dueDate);
    if (d.status) updatePayload.status = d.status;
    if (d.assigneeId !== undefined) updatePayload.assigneeId = d.assigneeId;

    const task = await updateTask(session.userId, session.role, params.id, updatePayload);
    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update task" },
      { status: err.status || 400 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    await deleteTask(session.userId, params.id);
    return NextResponse.json({ success: true, message: "Task deleted." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete task" },
      { status: err.status || 400 }
    );
  }
}


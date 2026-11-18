export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getEventTasks, createTask } from "@/lib/services/task";
import { fromPKTInput } from "@/lib/time";

const createTaskSchema = z.object({
  title: z.string().min(2, "Task title must be at least 2 characters"),
  description: z.string().min(2, "Task description is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().min(1, "Due date is required"),
  assigneeId: z.string().optional().nullable(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const data = await getEventTasks(params.id);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch tasks" },
      { status: err.status || 500 }
    );
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    const body = await req.json();

    const parseResult = createTaskSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid task input" },
        { status: 400 }
      );
    }

    const d = parseResult.data;
    const task = await createTask(session.userId, params.id, {
      title: d.title,
      description: d.description,
      priority: d.priority,
      dueDate: fromPKTInput(d.dueDate),
      assigneeId: d.assigneeId,
    });

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create task" },
      { status: err.status || 400 }
    );
  }
}


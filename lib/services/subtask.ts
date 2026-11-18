import { prisma } from "../db";
import { AppError } from "../errors";
import { notify } from "../notify";
import { z } from "zod";

export const CreateSubTaskSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(120),
  description: z.string().optional().default(""),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: z.string().min(1, "Due date is required"),
  assigneeId: z.string().nullable().optional(),
});

export const UpdateSubTaskPresidentSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED"]).optional(),
  assigneeId: z.string().nullable().optional(),
});

export async function createSubEventTask(
  presidentId: string,
  subEventId: string,
  rawInput: z.infer<typeof CreateSubTaskSchema>
) {
  const subEvent = await prisma.subEvent.findUnique({
    where: { id: subEventId },
    include: { megaEvent: true },
  });

  if (!subEvent || subEvent.megaEvent.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "Unauthorized to create tasks for this sub-event.", 403);
  }

  const parsed = CreateSubTaskSchema.parse(rawInput);

  if (parsed.assigneeId) {
    const student = await prisma.user.findUnique({ where: { id: parsed.assigneeId } });
    if (!student || student.role !== "STUDENT") {
      throw new AppError("INVALID_ASSIGNEE", "Assignee must be a registered student.", 400);
    }
  }

  const task = await prisma.task.create({
    data: {
      subEventId,
      eventId: null,
      title: parsed.title.trim(),
      description: parsed.description || "",
      priority: parsed.priority,
      dueDate: new Date(parsed.dueDate),
      status: "TODO",
      assigneeId: parsed.assigneeId || null,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify assignee if assigned
  if (parsed.assigneeId) {
    await notify(parsed.assigneeId, {
      type: "TASK_ASSIGNED",
      message: `You were assigned task '${task.title}' for sub-event '${subEvent.title}'.`,
      link: "/student/tasks",
    });
  }

  return task;
}

export async function updateSubEventTaskByPresident(
  presidentId: string,
  taskId: string,
  rawInput: z.infer<typeof UpdateSubTaskPresidentSchema>
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { subEvent: { include: { megaEvent: true } } },
  });

  if (!task || !task.subEvent || task.subEvent.megaEvent.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "Unauthorized to edit this task.", 403);
  }

  const parsed = UpdateSubTaskPresidentSchema.parse(rawInput);

  if (parsed.assigneeId && parsed.assigneeId !== task.assigneeId) {
    const student = await prisma.user.findUnique({ where: { id: parsed.assigneeId } });
    if (!student || student.role !== "STUDENT") {
      throw new AppError("INVALID_ASSIGNEE", "Assignee must be a registered student.", 400);
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: parsed.title ? parsed.title.trim() : undefined,
      description: parsed.description !== undefined ? parsed.description : undefined,
      priority: parsed.priority,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
      status: parsed.status,
      assigneeId: parsed.assigneeId !== undefined ? parsed.assigneeId : undefined,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  if (parsed.assigneeId && parsed.assigneeId !== task.assigneeId) {
    await notify(parsed.assigneeId, {
      type: "TASK_ASSIGNED",
      message: `You were assigned task '${updated.title}' for sub-event '${task.subEvent.title}'.`,
      link: "/student/tasks",
    });
  }

  return updated;
}

export async function updateSubEventTaskStatus(
  userId: string,
  userRole: string,
  taskId: string,
  status: "TODO" | "IN_PROGRESS" | "COMPLETED"
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      subEvent: {
        include: {
          megaEvent: true,
        },
      },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  if (!task || !task.subEvent) {
    throw new AppError("NOT_FOUND", "Sub-event task not found.", 404);
  }

  const isPresident = userRole === "PRESIDENT" && task.subEvent.megaEvent.presidentId === userId;
  const isSupervisor = task.subEvent.supervisorId === userId;
  const isAssignee = task.assigneeId === userId;

  if (!isPresident && !isSupervisor && !isAssignee) {
    throw new AppError("FORBIDDEN", "You do not have permission to update this task.", 403);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // If updater is not the president, notify the president
  if (!isPresident) {
    const updater = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await notify(task.subEvent.megaEvent.presidentId, {
      type: "SUB_TASK_STATUS_CHANGED",
      message: `Task '${task.title}' updated to ${status} by ${updater?.name || "a team member"}.`,
      link: `/president/mega-events/${task.subEvent.megaEventId}`,
    });
  }

  return updated;
}

export async function deleteSubEventTask(presidentId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { subEvent: { include: { megaEvent: true } } },
  });

  if (!task || !task.subEvent || task.subEvent.megaEvent.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "Unauthorized to delete this task.", 403);
  }

  await prisma.task.delete({ where: { id: taskId } });
  return { success: true };
}

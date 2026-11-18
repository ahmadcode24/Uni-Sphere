import { prisma } from "../db";
import { AppError } from "../errors";
import { notify } from "../notify";
import { publish } from "../realtime";

export async function getEventTasks(eventId: string) {
  const tasks = await prisma.task.findMany({
    where: { eventId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { tasks, total, completed, progressPercent };
}

export async function createTask(
  presidentId: string,
  eventId: string,
  data: {
    title: string;
    description: string;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    dueDate: Date;
    assigneeId?: string | null;
  }
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { society: true },
  });

  if (!event) throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);
  if (event.society.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "Unauthorized to create tasks for this event.", 403);
  }

  if (event.isCancelled) {
    throw new AppError("EVENT_CANCELLED", "Cannot create tasks for a cancelled event.", 400);
  }

  // If assignee provided, verify they have an ACCEPTED invitation
  if (data.assigneeId) {
    const invite = await prisma.invitation.findUnique({
      where: {
        eventId_studentId: {
          eventId,
          studentId: data.assigneeId,
        },
      },
    });

    if (!invite || invite.status !== "ACCEPTED") {
      throw new AppError(
        "INVALID_ASSIGNEE",
        "Tasks can only be assigned to accepted volunteers for this event.",
        400
      );
    }
  }

  const task = await prisma.task.create({
    data: {
      eventId,
      title: data.title.trim(),
      description: data.description.trim(),
      priority: data.priority || "MEDIUM",
      dueDate: data.dueDate,
      assigneeId: data.assigneeId || null,
      status: "TODO",
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify assignee if assigned
  if (data.assigneeId) {
    await notify(data.assigneeId, {
      type: "TASK_ASSIGNED",
      message: `You were assigned a task for '${event.title}': '${task.title}'.`,
      link: "/student/tasks",
    });
  }

  publish(`event:${eventId}`, { kind: "task", action: "created", task });

  return task;
}

export async function updateTask(
  userId: string,
  userRole: string,
  taskId: string,
  data: {
    title?: string;
    description?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    dueDate?: Date;
    status?: "TODO" | "IN_PROGRESS" | "COMPLETED";
    assigneeId?: string | null;
  }
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { event: { include: { society: true } } },
  });

  if (!task) throw new AppError("TASK_NOT_FOUND", "Task not found", 404);

  const isPresident =
    userRole === "PRESIDENT" && task.event.society.presidentId === userId;
  const isAssignee = task.assigneeId === userId;

  if (!isPresident && !isAssignee) {
    throw new AppError("FORBIDDEN", "You do not have permission to update this task.", 403);
  }

  // Volunteers can ONLY update the status of their assigned tasks
  if (!isPresident && isAssignee) {
    if (!data.status) {
      throw new AppError("FORBIDDEN", "Volunteers can only update task status.", 403);
    }
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status: data.status },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });

    // Notify President
    await notify(task.event.society.presidentId, {
      type: "TASK_STATUS_CHANGED",
      message: `Task '${task.title}' updated to ${data.status}.`,
      link: `/president/events/${task.eventId}/tasks`,
    });

    publish(`event:${task.eventId}`, { kind: "task", action: "updated", task: updated });

    return updated;
  }

  // President can update all fields
  const updateData: any = {};
  if (data.title) updateData.title = data.title.trim();
  if (data.description) updateData.description = data.description.trim();
  if (data.priority) updateData.priority = data.priority;
  if (data.dueDate) updateData.dueDate = data.dueDate;
  if (data.status) updateData.status = data.status;

  if (data.assigneeId !== undefined) {
    if (data.assigneeId) {
      const invite = await prisma.invitation.findUnique({
        where: {
          eventId_studentId: {
            eventId: task.eventId,
            studentId: data.assigneeId,
          },
        },
      });

      if (!invite || invite.status !== "ACCEPTED") {
        throw new AppError(
          "INVALID_ASSIGNEE",
          "Tasks can only be assigned to accepted volunteers.",
          400
        );
      }
      updateData.assigneeId = data.assigneeId;
    } else {
      updateData.assigneeId = null;
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });

  // Notify assignee if newly assigned or changed
  if (data.assigneeId && data.assigneeId !== task.assigneeId) {
    await notify(data.assigneeId, {
      type: "TASK_ASSIGNED",
      message: `You were assigned a task for '${task.event.title}': '${task.title}'.`,
      link: "/student/tasks",
    });
  }

  publish(`event:${task.eventId}`, { kind: "task", action: "updated", task: updated });

  return updated;
}

export async function deleteTask(presidentId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { event: { include: { society: true } } },
  });

  if (!task) throw new AppError("NOT_FOUND", "Task not found", 404);
  if (task.event.society.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "Unauthorized to delete task.", 403);
  }

  await prisma.task.delete({ where: { id: taskId } });
  publish(`event:${task.eventId}`, { kind: "task", action: "deleted", taskId });
  return { success: true };
}

export async function getStudentTasks(studentId: string) {
  return prisma.task.findMany({
    where: { assigneeId: studentId },
    include: {
      event: {
        include: {
          society: { select: { id: true, name: true, category: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });
}


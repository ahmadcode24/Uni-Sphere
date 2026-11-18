import { prisma } from "../db";
import { AppError } from "../errors";
import { notify } from "../notify";
import { eventCaps } from "./event";

export async function getAdminStats() {
  const [
    societiesCount,
    eventsCount,
    registrationsCount,
    pendingProposals,
    cancelRequests,
    allEvents,
  ] = await Promise.all([
    prisma.society.count(),
    prisma.event.count(),
    prisma.registration.count({ where: { status: "REGISTERED" } }),
    prisma.event.findMany({
      where: { approvalStatus: "PENDING" },
      include: {
        society: { select: { id: true, name: true, category: true } },
        _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.event.findMany({
      where: { approvalStatus: "CANCEL_REQUESTED" },
      include: {
        society: { select: { id: true, name: true, category: true } },
        _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.event.findMany({
      include: {
        society: { select: { id: true, name: true, category: true } },
        _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    societiesCount,
    eventsCount,
    registrationsCount,
    pendingProposals,
    cancelRequests,
    allEvents,
  };
}

export async function decideEventProposal(
  adminId: string,
  eventId: string,
  decision: "APPROVE" | "REJECT",
  remarks?: string
) {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "Only administrators can review event proposals.", 403);
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { society: true },
  });

  if (!event) throw new AppError("EVENT_NOT_FOUND", "Event proposal not found.", 404);

  const now = new Date();
  const caps = eventCaps(event, now);

  if (decision === "APPROVE") {
    if (!caps.canAdminApprove) {
      if (now >= event.startAt) {
        throw new AppError(
          "EVENT_ALREADY_STARTED",
          "This event has already started while pending review. Admin can only reject it.",
          400
        );
      }
      throw new AppError("CANNOT_APPROVE", "This event cannot be approved in its current state.", 400);
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        approvalStatus: "APPROVED",
        hasBeenApproved: true,
        approvedBudget: event.proposedBudget, // Exact match to proposed budget
        adminRemarks: remarks ? remarks.trim() : "Approved as proposed.",
        decidedAt: now,
      },
    });

    await notify(event.society.presidentId, {
      type: "EVENT_APPROVED",
      message: `Your event proposal '${event.title}' was approved by administration.`,
      link: `/president/events/${event.id}`,
    });

    return updated;
  }

  if (decision === "REJECT") {
    if (!remarks || remarks.trim().length === 0) {
      throw new AppError("REMARKS_REQUIRED", "Admin remarks are strictly required when rejecting a proposal.", 400);
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        approvalStatus: "REJECTED",
        adminRemarks: remarks.trim(),
        decidedAt: now,
      },
    });

    await notify(event.society.presidentId, {
      type: "EVENT_REJECTED",
      message: `Your event proposal '${event.title}' was rejected by administration. Remarks: "${remarks.trim()}"`,
      link: `/president/events/${event.id}/edit`,
    });

    return updated;
  }

  throw new AppError("INVALID_DECISION", "Decision must be APPROVE or REJECT.", 400);
}

export async function decideCancellationRequest(
  adminId: string,
  eventId: string,
  decision: "APPROVE_CANCEL" | "REJECT_CANCEL",
  remarks?: string
) {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "Only administrators can decide cancellation requests.", 403);
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      society: true,
      registrations: { where: { status: "REGISTERED" } },
    },
  });

  if (!event) throw new AppError("EVENT_NOT_FOUND", "Event not found.", 404);

  if (decision === "APPROVE_CANCEL") {
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark all active registrations as CANCELLED
      await tx.registration.updateMany({
        where: { eventId, status: "REGISTERED" },
        data: { status: "CANCELLED" },
      });

      // 2. Mark event as cancelled
      return tx.event.update({
        where: { id: eventId },
        data: {
          isCancelled: true,
          approvalStatus: "CANCELLED",
          adminRemarks: remarks ? remarks.trim() : "Cancellation approved by administration.",
          decidedAt: new Date(),
        },
      });
    });

    // Notify president
    await notify(event.society.presidentId, {
      type: "EVENT_CANCELLED",
      message: `Your cancellation request for '${event.title}' was approved by administration.`,
      link: `/president/events/${event.id}`,
    });

    // Notify registered students
    const studentIds = event.registrations.map((r) => r.studentId);
    if (studentIds.length > 0) {
      await notify(studentIds, {
        type: "EVENT_CANCELLED",
        message: `Notice: '${event.title}' has been cancelled by the university administration.`,
        link: `/student/registrations`,
      });
    }

    return updated;
  }

  if (decision === "REJECT_CANCEL") {
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        approvalStatus: event.hasBeenApproved ? "APPROVED" : "PENDING",
        adminRemarks: remarks ? remarks.trim() : "Cancellation request declined. Event remains active.",
        decidedAt: new Date(),
      },
    });

    await notify(event.society.presidentId, {
      type: "EVENT_CANCEL_REJECTED",
      message: `Your cancellation request for '${event.title}' was declined by administration. Event remains active.`,
      link: `/president/events/${event.id}`,
    });

    return updated;
  }

  throw new AppError("INVALID_DECISION", "Decision must be APPROVE_CANCEL or REJECT_CANCEL", 400);
}

export async function adminDeleteEvent(adminId: string, eventId: string) {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "Only administrators can delete events.", 403);
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      society: true,
      registrations: { where: { status: "REGISTERED" } },
    },
  });

  if (!event) throw new AppError("EVENT_NOT_FOUND", "Event not found.", 404);

  // Cascade delete all relations and the event
  await prisma.$transaction([
    prisma.registration.deleteMany({ where: { eventId } }),
    prisma.invitation.deleteMany({ where: { eventId } }),
    prisma.task.deleteMany({ where: { eventId } }),
    prisma.expense.deleteMany({ where: { eventId } }),
    prisma.event.delete({ where: { id: eventId } }),
  ]);

  // Notify president
  await notify(event.society.presidentId, {
    type: "EVENT_DELETED",
    message: `Administration has removed the event '${event.title}'.`,
    link: `/president/events`,
  });

  // Notify registered students if any
  const studentIds = event.registrations.map((r) => r.studentId);
  if (studentIds.length > 0) {
    await notify(studentIds, {
      type: "EVENT_DELETED",
      message: `Notice: '${event.title}' was removed by administration.`,
      link: `/student/events`,
    });
  }

  return { success: true, message: `Event '${event.title}' permanently deleted.` };
}

export async function getAdminMonitoring(filter?: string) {
  const where: any = {};
  const now = new Date();

  if (filter === "approved") {
    where.approvalStatus = "APPROVED";
  } else if (filter === "upcoming") {
    where.approvalStatus = "APPROVED";
    where.isCancelled = false;
    where.startAt = { gt: now };
  } else if (filter === "ongoing") {
    where.approvalStatus = "APPROVED";
    where.isCancelled = false;
    where.startAt = { lte: now };
    where.endAt = { gte: now };
  } else if (filter === "completed") {
    where.approvalStatus = "APPROVED";
    where.endAt = { lt: now };
  }

  return prisma.event.findMany({
    where,
    include: {
      society: true,
      registrations: { where: { status: "REGISTERED" } },
      tasks: true,
      expenses: true,
    },
    orderBy: { startAt: "desc" },
  });
}


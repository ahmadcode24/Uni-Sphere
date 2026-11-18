import { prisma } from "../db";
import { AppError } from "../errors";
import { notify } from "../notify";
import { eventCaps } from "./event";

export async function getAdminStats() {
  const [societiesCount, eventsCount, registrationsCount, pendingProposals] = await Promise.all([
    prisma.society.count(),
    prisma.event.count(),
    prisma.registration.count({ where: { status: "REGISTERED" } }),
    prisma.event.findMany({
      where: { approvalStatus: "PENDING" },
      include: {
        society: { select: { id: true, name: true, category: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  return {
    societiesCount,
    eventsCount,
    registrationsCount,
    pendingProposals,
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


import { prisma } from "../db";
import { AppError } from "../errors";
import { notify } from "../notify";
import { publish } from "../realtime";
import { schedule } from "../time";

export interface EventCapabilities {
  publicVisible: boolean;
  publicListed: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canRegister: boolean;
  canInvite: boolean;
  canAddExpense: boolean;
  canCancel: boolean;
  canAdminApprove: boolean;
  canAdminReject: boolean;
  scheduleStatus: "UPCOMING" | "ONGOING" | "COMPLETED";
}

export function eventCaps(
  event: {
    startAt: Date | string;
    endAt: Date | string;
    registrationDeadline: Date | string;
    approvalStatus: string;
    isCancelled: boolean;
    hasBeenApproved?: boolean;
  },
  now = new Date()
): EventCapabilities {
  const startAt = typeof event.startAt === "string" ? new Date(event.startAt) : event.startAt;
  const endAt = typeof event.endAt === "string" ? new Date(event.endAt) : event.endAt;
  const deadline =
    typeof event.registrationDeadline === "string"
      ? new Date(event.registrationDeadline)
      : event.registrationDeadline;

  const sched = schedule({ startAt, endAt }, now);
  const isCancelled = event.isCancelled;
  const status = event.approvalStatus;

  // 1. Cancellation check
  if (isCancelled) {
    return {
      publicVisible: false,
      publicListed: false,
      canEdit: false,
      canSubmit: false,
      canRegister: false,
      canInvite: false,
      canAddExpense: false,
      canCancel: false,
      canAdminApprove: false,
      canAdminReject: false,
      scheduleStatus: sched,
    };
  }

  // 2. Draft
  if (status === "DRAFT") {
    const isPastStart = now >= startAt;
    return {
      publicVisible: false,
      publicListed: false,
      canEdit: !isPastStart,
      canSubmit: !isPastStart,
      canRegister: false,
      canInvite: false,
      canAddExpense: false,
      canCancel: true,
      canAdminApprove: false,
      canAdminReject: false,
      scheduleStatus: sched,
    };
  }

  // 3. Pending
  if (status === "PENDING") {
    const isPastStart = now >= startAt;
    return {
      publicVisible: false,
      publicListed: false,
      canEdit: false, // Locked while pending
      canSubmit: false,
      canRegister: false,
      canInvite: false,
      canAddExpense: false,
      canCancel: true,
      canAdminApprove: !isPastStart, // Cannot approve if event already started
      canAdminReject: true,
      scheduleStatus: sched,
    };
  }

  // 4. Rejected
  if (status === "REJECTED") {
    const isPastStart = now >= startAt;
    return {
      publicVisible: false,
      publicListed: false,
      canEdit: !isPastStart,
      canSubmit: !isPastStart, // explicit submit required after edit
      canRegister: false,
      canInvite: false,
      canAddExpense: false,
      canCancel: true,
      canAdminApprove: false,
      canAdminReject: false,
      scheduleStatus: sched,
    };
  }

  // 5. Approved
  if (status === "APPROVED") {
    if (sched === "UPCOMING") {
      const isPastDeadline = now > deadline;
      return {
        publicVisible: true,
        publicListed: true,
        canEdit: true, // returns event to Pending
        canSubmit: false,
        canRegister: !isPastDeadline && now < startAt,
        canInvite: now < startAt,
        canAddExpense: true,
        canCancel: true,
        canAdminApprove: false,
        canAdminReject: false,
        scheduleStatus: "UPCOMING",
      };
    }

    if (sched === "ONGOING") {
      return {
        publicVisible: true,
        publicListed: true,
        canEdit: false,
        canSubmit: false,
        canRegister: false, // registration closed once ongoing
        canInvite: false,
        canAddExpense: true,
        canCancel: true,
        canAdminApprove: false,
        canAdminReject: false,
        scheduleStatus: "ONGOING",
      };
    }

    // Completed
    return {
      publicVisible: true, // direct link works
      publicListed: false, // hidden from upcoming listings
      canEdit: false,
      canSubmit: false,
      canRegister: false,
      canInvite: false,
      canAddExpense: true, // record remaining receipts
      canCancel: false, // completed events cannot be cancelled
      canAdminApprove: false,
      canAdminReject: false,
      scheduleStatus: "COMPLETED",
    };
  }

  // Fallback safe defaults
  return {
    publicVisible: false,
    publicListed: false,
    canEdit: false,
    canSubmit: false,
    canRegister: false,
    canInvite: false,
    canAddExpense: false,
    canCancel: false,
    canAdminApprove: false,
    canAdminReject: false,
    scheduleStatus: sched,
  };
}

export async function createEvent(
  presidentId: string,
  data: {
    title: string;
    description: string;
    venue: string;
    startAt: Date;
    endAt: Date;
    registrationDeadline: Date;
    capacity: number;
    proposedBudget: number;
  }
) {
  const society = await prisma.society.findUnique({
    where: { presidentId },
  });

  if (!society) {
    throw new AppError("SOCIETY_NOT_FOUND", "You must create a society before proposing events.", 404);
  }

  // Validation rules: start < end; deadline <= start; capacity >= 1; proposedBudget >= 0
  if (data.startAt >= data.endAt) {
    throw new AppError("INVALID_DATES", "Event start time must be before end time.", 400);
  }
  if (data.registrationDeadline > data.startAt) {
    throw new AppError(
      "INVALID_DEADLINE",
      "Registration deadline cannot be after event start time.",
      400
    );
  }
  if (data.capacity < 1) {
    throw new AppError("INVALID_CAPACITY", "Event capacity must be at least 1.", 400);
  }
  if (data.proposedBudget < 0) {
    throw new AppError("INVALID_BUDGET", "Proposed budget cannot be negative.", 400);
  }

  return prisma.event.create({
    data: {
      societyId: society.id,
      title: data.title.trim(),
      description: data.description.trim(),
      venue: data.venue.trim(),
      startAt: data.startAt,
      endAt: data.endAt,
      registrationDeadline: data.registrationDeadline,
      capacity: data.capacity,
      proposedBudget: data.proposedBudget,
      approvalStatus: "DRAFT",
    },
  });
}

export async function submitEvent(presidentId: string, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { society: true },
  });

  if (!event) throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);
  if (event.society.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "Unauthorized to submit this event.", 403);
  }

  const caps = eventCaps(event);
  if (!caps.canSubmit) {
    throw new AppError("CANNOT_SUBMIT", "This event cannot be submitted in its current state.", 400);
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      approvalStatus: "PENDING",
      submittedAt: new Date(),
    },
  });

  // Notify all Admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  const adminIds = admins.map((a) => a.id);

  await notify(adminIds, {
    type: "EVENT_SUBMITTED",
    message: `New proposal submitted: '${event.title}' by ${event.society.name}.`,
    link: `/admin/review/${event.id}`,
  });

  // Publish to admin realtime channel
  publish("admin", {
    kind: "event_submitted",
    eventId: event.id,
    title: event.title,
  });

  return updated;
}

export async function updateEvent(
  presidentId: string,
  eventId: string,
  data: {
    title?: string;
    description?: string;
    venue?: string;
    startAt?: Date;
    endAt?: Date;
    registrationDeadline?: Date;
    capacity?: number;
    proposedBudget?: number;
  }
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      society: true,
      _count: {
        select: { registrations: { where: { status: "REGISTERED" } } },
      },
    },
  });

  if (!event) throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);
  if (event.society.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "Unauthorized to edit this event.", 403);
  }

  const caps = eventCaps(event);
  if (!caps.canEdit) {
    throw new AppError("LOCKED", "This event cannot be edited in its current state.", 400);
  }

  const startAt = data.startAt || event.startAt;
  const endAt = data.endAt || event.endAt;
  const deadline = data.registrationDeadline || event.registrationDeadline;

  if (startAt >= endAt) {
    throw new AppError("INVALID_DATES", "Start time must be before end time.", 400);
  }
  if (deadline > startAt) {
    throw new AppError("INVALID_DEADLINE", "Registration deadline cannot be after start time.", 400);
  }

  // Capacity edit rule: capacity cannot go below active registered count
  const activeCount = event._count.registrations;
  if (data.capacity !== undefined) {
    if (data.capacity < 1) throw new AppError("INVALID_CAPACITY", "Capacity must be >= 1", 400);
    if (data.capacity < activeCount) {
      throw new AppError(
        "CAPACITY_TOO_LOW",
        `Capacity cannot be reduced below the ${activeCount} registered attendees.`,
        400
      );
    }
  }

  const updateData: any = {};
  if (data.title) updateData.title = data.title.trim();
  if (data.description) updateData.description = data.description.trim();
  if (data.venue) updateData.venue = data.venue.trim();
  if (data.startAt) updateData.startAt = data.startAt;
  if (data.endAt) updateData.endAt = data.endAt;
  if (data.registrationDeadline) updateData.registrationDeadline = data.registrationDeadline;
  if (data.capacity !== undefined) updateData.capacity = data.capacity;
  if (data.proposedBudget !== undefined) updateData.proposedBudget = data.proposedBudget;

  // Editing an Approved+Upcoming event -> status becomes PENDING, hasBeenApproved stays true, approvedBudget stays
  if (event.approvalStatus === "APPROVED") {
    updateData.approvalStatus = "PENDING";
    updateData.adminRemarks = null;
    updateData.submittedAt = new Date();

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await notify(admins.map((a) => a.id), {
      type: "EVENT_RESUBMITTED",
      message: `Event modified & resubmitted: '${event.title}'.`,
      link: `/admin/review/${event.id}`,
    });
  }

  return prisma.event.update({
    where: { id: eventId },
    data: updateData,
  });
}

export async function cancelEvent(presidentId: string, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      society: true,
      registrations: { where: { status: "REGISTERED" } },
      invitations: { where: { status: { in: ["PENDING", "ACCEPTED"] } } },
    },
  });

  if (!event) throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);
  if (event.society.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "Unauthorized to cancel this event.", 403);
  }

  const caps = eventCaps(event);
  if (!caps.canCancel) {
    throw new AppError("CANNOT_CANCEL", "This event cannot be cancelled.", 400);
  }

  // Cancellation is irreversible; all active registrations become CANCELLED
  const updated = await prisma.$transaction(async (tx) => {
    await tx.registration.updateMany({
      where: { eventId, status: "REGISTERED" },
      data: { status: "CANCELLED" },
    });

    return tx.event.update({
      where: { id: eventId },
      data: { isCancelled: true },
    });
  });

  // Notify registered students + invited volunteers (Bonus F implemented cleanly)
  const registeredStudentIds = event.registrations.map((r) => r.studentId);
  const invitedStudentIds = event.invitations.map((i) => i.studentId);
  const notifyIds = Array.from(new Set([...registeredStudentIds, ...invitedStudentIds]));

  if (notifyIds.length > 0) {
    await notify(notifyIds, {
      type: "EVENT_CANCELLED",
      message: `Notice: '${event.title}' scheduled for ${event.venue} has been cancelled.`,
      link: "/events",
    });
  }

  return updated;
}


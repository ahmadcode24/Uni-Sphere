import { prisma } from "../db";
import { AppError } from "../errors";
import { notify } from "../notify";
import { eventCaps } from "./event";

export async function inviteVolunteer(presidentId: string, eventId: string, studentId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { society: true },
  });

  if (!event) throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);
  if (event.society.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "Unauthorized to invite volunteers for this event.", 403);
  }

  const caps = eventCaps(event);
  if (!caps.canInvite) {
    if (event.isCancelled) throw new AppError("EVENT_CANCELLED", "Event is cancelled.", 400);
    if (event.approvalStatus !== "APPROVED") {
      throw new AppError("EVENT_NOT_APPROVED", "Volunteers can only be invited to Approved events.", 400);
    }
    if (new Date() >= event.startAt) {
      throw new AppError("EVENT_STARTED", "Cannot invite volunteers after event has started.", 400);
    }
    throw new AppError("CANNOT_INVITE", "Invitations are not allowed in this event state.", 400);
  }

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT") {
    throw new AppError("INVALID_STUDENT", "Only students can be invited as volunteers.", 400);
  }

  // Check existing invitation
  const existing = await prisma.invitation.findUnique({
    where: { eventId_studentId: { eventId, studentId } },
  });

  if (existing) {
    if (existing.status === "DECLINED") {
      throw new AppError("INVITATION_DECLINED", "This student previously declined the invitation and cannot be re-invited.", 400);
    }
    if (existing.status === "ACCEPTED") {
      throw new AppError("ALREADY_VOLUNTEER", "This student is already an accepted volunteer.", 400);
    }
    throw new AppError("ALREADY_INVITED", "An invitation is already pending for this student.", 400);
  }

  const invitation = await prisma.invitation.create({
    data: {
      eventId,
      studentId,
      status: "PENDING",
    },
  });

  // Notify Student
  await notify(studentId, {
    type: "VOLUNTEER_INVITATION",
    message: `You were invited to volunteer for '${event.title}' by ${event.society.name}.`,
    link: "/student/invitations",
  });

  return invitation;
}

export async function respondToInvitation(
  studentId: string,
  invitationId: string,
  action: "accept" | "decline"
) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      event: { include: { society: true } },
      student: true,
    },
  });

  if (!invitation) throw new AppError("NOT_FOUND", "Invitation not found", 404);
  if (invitation.studentId !== studentId) {
    throw new AppError("FORBIDDEN", "Unauthorized to respond to this invitation.", 403);
  }

  if (invitation.status !== "PENDING") {
    throw new AppError("FINAL_RESPONSE", "Response is final and cannot be modified.", 400);
  }

  const newStatus = action === "accept" ? "ACCEPTED" : "DECLINED";

  const updated = await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      status: newStatus,
      respondedAt: new Date(),
    },
  });

  // Notify President
  await notify(invitation.event.society.presidentId, {
    type: "INVITATION_RESPONSE",
    message: `${invitation.student.name} ${action}ed your volunteer invitation for '${invitation.event.title}'.`,
    link: `/president/events/${invitation.eventId}/volunteers`,
  });

  return updated;
}

export async function getEventInvitations(eventId: string) {
  return prisma.invitation.findMany({
    where: { eventId },
    include: {
      student: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStudentInvitations(studentId: string) {
  return prisma.invitation.findMany({
    where: { studentId },
    include: {
      event: {
        include: {
          society: { select: { id: true, name: true, category: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function withdrawVolunteer(studentId: string, invitationId: string) {
  const invite = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { event: { include: { society: true } } },
  });

  if (!invite) throw new AppError("NOT_FOUND", "Invitation not found", 404);
  if (invite.studentId !== studentId) {
    throw new AppError("FORBIDDEN", "Unauthorized.", 403);
  }

  // Update invitation status
  const updatedInvite = await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "DECLINED" },
  });

  // Withdrawal rules:
  // 1. Incomplete tasks (TODO) -> unassigned (assigneeId: null)
  // 2. In Progress tasks (IN_PROGRESS) -> status: "TODO", assigneeId: null
  // 3. Completed tasks (COMPLETED) -> keep assignee and remain COMPLETED
  await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({
      where: {
        eventId: invite.eventId,
        assigneeId: studentId,
        status: "IN_PROGRESS",
      },
      data: {
        status: "TODO",
        assigneeId: null,
      },
    });

    await tx.task.updateMany({
      where: {
        eventId: invite.eventId,
        assigneeId: studentId,
        status: "TODO",
      },
      data: {
        assigneeId: null,
      },
    });
  });

  await notify(invite.event.society.presidentId, {
    type: "VOLUNTEER_WITHDRAWN",
    message: `Volunteer withdrew from '${invite.event.title}'. Incomplete tasks were reset to To Do and unassigned.`,
    link: `/president/events/${invite.eventId}/tasks`,
  });

  return updatedInvite;
}


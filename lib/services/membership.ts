import { prisma } from "../db";
import { AppError } from "../errors";
import { notify } from "../notify";

export async function getStudentMembership(societyId: string, studentId: string) {
  return prisma.membership.findUnique({
    where: {
      societyId_studentId: {
        societyId,
        studentId,
      },
    },
  });
}

export async function requestMembership(societyId: string, studentId: string) {
  const society = await prisma.society.findUnique({
    where: { id: societyId },
    include: { president: true },
  });

  if (!society) {
    throw new AppError("SOCIETY_NOT_FOUND", "Society not found", 404);
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
  });

  if (!student || student.role !== "STUDENT") {
    throw new AppError("FORBIDDEN", "Only students can request society membership.", 403);
  }

  // Check existing membership row
  const existing = await prisma.membership.findUnique({
    where: {
      societyId_studentId: {
        societyId,
        studentId,
      },
    },
  });

  let membership;

  if (existing) {
    if (existing.status === "PENDING") {
      throw new AppError(
        "ALREADY_PENDING",
        "You already have a pending membership request for this society.",
        400
      );
    }
    if (existing.status === "APPROVED") {
      throw new AppError("ALREADY_MEMBER", "You are already a member of this society.", 400);
    }

    // Reuse row if REJECTED or REMOVED
    membership = await prisma.membership.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        updatedAt: new Date(),
      },
    });
  } else {
    membership = await prisma.membership.create({
      data: {
        societyId,
        studentId,
        status: "PENDING",
        label: "MEMBER",
      },
    });
  }

  // Notify President
  await notify(society.presidentId, {
    type: "MEMBERSHIP_REQUEST",
    message: `${student.name} requested to join ${society.name}.`,
    link: "/president/members",
  });

  return membership;
}

export async function getSocietyMembers(presidentId: string, societyId: string) {
  const society = await prisma.society.findUnique({
    where: { id: societyId },
  });

  if (!society) {
    throw new AppError("SOCIETY_NOT_FOUND", "Society not found", 404);
  }

  if (society.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "You can only view members of your own society.", 403);
  }

  return prisma.membership.findMany({
    where: {
      societyId,
      status: { in: ["PENDING", "APPROVED"] },
    },
    include: {
      student: {
        select: { id: true, name: true, email: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function manageMembership(
  presidentId: string,
  membershipId: string,
  action: "approve" | "reject" | "remove" | "label",
  labelValue?: "MEMBER" | "CORE"
) {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { society: true, student: true },
  });

  if (!membership) {
    throw new AppError("MEMBERSHIP_NOT_FOUND", "Membership record not found", 404);
  }

  if (membership.society.presidentId !== presidentId) {
    throw new AppError("FORBIDDEN", "You are not authorized to manage this membership.", 403);
  }

  if (action === "approve") {
    if (membership.status !== "PENDING") {
      throw new AppError("INVALID_ACTION", "Only pending requests can be approved.", 400);
    }
    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: { status: "APPROVED" },
    });

    await notify(membership.studentId, {
      type: "MEMBERSHIP_APPROVED",
      message: `Your membership request for ${membership.society.name} has been approved!`,
      link: `/student/societies/${membership.societyId}`,
    });

    return updated;
  }

  if (action === "reject") {
    if (membership.status !== "PENDING") {
      throw new AppError("INVALID_ACTION", "Only pending requests can be rejected.", 400);
    }
    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: { status: "REJECTED" },
    });

    await notify(membership.studentId, {
      type: "MEMBERSHIP_REJECTED",
      message: `Your membership request for ${membership.society.name} was declined.`,
      link: `/student/societies/${membership.societyId}`,
    });

    return updated;
  }

  if (action === "remove") {
    if (membership.status !== "APPROVED") {
      throw new AppError("INVALID_ACTION", "Only approved members can be removed.", 400);
    }
    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: { status: "REMOVED" },
    });

    await notify(membership.studentId, {
      type: "MEMBERSHIP_REMOVED",
      message: `You were removed from ${membership.society.name}.`,
      link: `/student/societies/${membership.societyId}`,
    });

    return updated;
  }

  if (action === "label") {
    if (membership.status !== "APPROVED") {
      throw new AppError("INVALID_ACTION", "Only approved members can be labeled.", 400);
    }
    const targetLabel = labelValue === "CORE" ? "CORE" : "MEMBER";
    return prisma.membership.update({
      where: { id: membershipId },
      data: { label: targetLabel },
    });
  }

  throw new AppError("INVALID_ACTION", "Invalid membership action.", 400);
}


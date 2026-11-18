import { prisma } from "../db";
import { AppError } from "../errors";
import { notify } from "../notify";
import { eventCaps } from "./event";

export async function registerForEvent(eventId: string, studentId: string): Promise<any> {
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Row-level lock on Event to serialize concurrent capacity updates in Postgres
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;

    const event = await tx.event.findUnique({
      where: { id: eventId },
      include: { society: true },
    });

    if (!event) throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);

    const caps = eventCaps(event, now);
    if (!caps.canRegister) {
      if (event.isCancelled) throw new AppError("EVENT_CANCELLED", "This event has been cancelled.", 400);
      if (now > event.registrationDeadline) {
        throw new AppError("DEADLINE_PASSED", "Registration deadline for this event has passed.", 400);
      }
      if (now >= event.startAt) {
        throw new AppError("EVENT_STARTED", "This event has already started.", 400);
      }
      throw new AppError("REGISTRATION_CLOSED", "Registration is not available for this event.", 400);
    }

    // Check if user already registered
    const existing = await tx.registration.findUnique({
      where: { eventId_studentId: { eventId, studentId } },
    });

    if (existing && existing.status === "REGISTERED") {
      throw new AppError("ALREADY_REGISTERED", "You are already registered for this event.", 400);
    }

    // Count currently registered attendees within the locked transaction
    const activeCount = await tx.registration.count({
      where: { eventId, status: "REGISTERED" },
    });

    if (activeCount >= event.capacity) {
      throw new AppError("EVENT_FULL", "This event is completely full. Check back if someone cancels.", 400);
    }

    // Upsert registration record (flips CANCELLED -> REGISTERED or creates new)
    const registration = await tx.registration.upsert({
      where: { eventId_studentId: { eventId, studentId } },
      create: { eventId, studentId, status: "REGISTERED" },
      update: { status: "REGISTERED" },
    });

    const newCount = activeCount + 1;
    const remaining = Math.max(0, event.capacity - newCount);

    return { registration, remaining, event, newCount };
  }, {
    maxWait: 45000,
    timeout: 45000,
  });

  // Notify President
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (student) {
    await notify(result.event.society.presidentId, {
      type: "NEW_REGISTRATION",
      message: `${student.name} registered for '${result.event.title}'.`,
      link: `/president/events/${eventId}`,
    });
  }

  return { registration: result.registration, seatsRemaining: result.remaining };
}

export async function cancelRegistration(eventId: string, studentId: string) {
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // Row-level lock on Event to serialize concurrent capacity updates
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;

    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);

    if (event.isCancelled) {
      throw new AppError("EVENT_CANCELLED", "Event has already been cancelled.", 400);
    }
    if (now >= event.startAt) {
      throw new AppError("CANNOT_CANCEL", "Cannot cancel registration after event has started.", 400);
    }

    const reg = await tx.registration.findUnique({
      where: { eventId_studentId: { eventId, studentId } },
    });

    if (!reg || reg.status !== "REGISTERED") {
      throw new AppError("NOT_REGISTERED", "You do not have an active registration for this event.", 400);
    }

    const updated = await tx.registration.update({
      where: { id: reg.id },
      data: { status: "CANCELLED" },
    });

    const newActiveCount = await tx.registration.count({
      where: { eventId, status: "REGISTERED" },
    });

    const remaining = Math.max(0, event.capacity - newActiveCount);

    return { success: true, seatsRemaining: remaining };
  });
}

export async function getEventRegistrations(eventId: string) {
  return prisma.registration.findMany({
    where: { eventId },
    include: {
      student: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

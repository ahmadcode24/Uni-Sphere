import { prisma } from "../db";
import { AppError } from "../errors";
import { notify } from "../notify";
import { publish } from "../realtime";
import { eventCaps } from "./event";

let regLock = Promise.resolve();

async function executeRegister(eventId: string, studentId: string) {
  const now = new Date();

  const event = await prisma.event.findUnique({
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
  const existing = await prisma.registration.findUnique({
    where: { eventId_studentId: { eventId, studentId } },
  });

  if (existing && existing.status === "REGISTERED") {
    throw new AppError("ALREADY_REGISTERED", "You are already registered for this event.", 400);
  }

  // Count currently registered attendees
  const activeCount = await prisma.registration.count({
    where: { eventId, status: "REGISTERED" },
  });

  if (activeCount >= event.capacity) {
    throw new AppError("EVENT_FULL", "This event is completely full. Check back if someone cancels.", 400);
  }

  // Upsert registration record (flips CANCELLED -> REGISTERED or creates new)
  const registration = await prisma.registration.upsert({
    where: { eventId_studentId: { eventId, studentId } },
    create: { eventId, studentId, status: "REGISTERED" },
    update: { status: "REGISTERED" },
  });

  const newCount = activeCount + 1;
  const remaining = Math.max(0, event.capacity - newCount);

  // Publish live update to realtime SSE channel for this event
  publish(`event:${eventId}`, {
    kind: "seats",
    eventId,
    registeredCount: newCount,
    capacity: event.capacity,
    seatsRemaining: remaining,
  });

  // Also publish to president's dashboard
  publish(`user:${event.society.presidentId}`, {
    kind: "registration_count",
    eventId,
    registeredCount: newCount,
  });

  // Notify President
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (student) {
    await notify(event.society.presidentId, {
      type: "NEW_REGISTRATION",
      message: `${student.name} registered for '${event.title}'.`,
      link: `/president/events/${eventId}`,
    });
  }

  return { registration, seatsRemaining: remaining };
}

export async function registerForEvent(eventId: string, studentId: string): Promise<any> {
  const previousLock = regLock;
  let release: () => void;
  regLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  try {
    await previousLock;
    return await executeRegister(eventId, studentId);
  } finally {
    release!();
  }
}

export async function cancelRegistration(eventId: string, studentId: string) {
  const now = new Date();

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError("EVENT_NOT_FOUND", "Event not found", 404);

  if (event.isCancelled) {
    throw new AppError("EVENT_CANCELLED", "Event has already been cancelled.", 400);
  }
  if (now >= event.startAt) {
    throw new AppError("CANNOT_CANCEL", "Cannot cancel registration after event has started.", 400);
  }

  const reg = await prisma.registration.findUnique({
    where: { eventId_studentId: { eventId, studentId } },
  });

  if (!reg || reg.status !== "REGISTERED") {
    throw new AppError("NOT_REGISTERED", "You do not have an active registration for this event.", 400);
  }

  const updated = await prisma.registration.update({
    where: { id: reg.id },
    data: { status: "CANCELLED" },
  });

  const newActiveCount = await prisma.registration.count({
    where: { eventId, status: "REGISTERED" },
  });

  const remaining = Math.max(0, event.capacity - newActiveCount);

  // Publish live updated seat count
  publish(`event:${eventId}`, {
    kind: "seats",
    eventId,
    registeredCount: newActiveCount,
    capacity: event.capacity,
    seatsRemaining: remaining,
  });

  return { success: true, seatsRemaining: remaining };
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

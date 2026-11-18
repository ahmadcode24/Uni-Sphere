export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { eventCaps, updateEvent } from "@/lib/services/event";
import { fromPKTInput } from "@/lib/time";

const updateEventSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  venue: z.string().min(2).optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  registrationDeadline: z.string().optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  proposedBudget: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        society: {
          select: {
            id: true,
            name: true,
            category: true,
            presidentId: true,
            contactEmail: true,
            contactPhone: true,
            logoUrl: true,
          },
        },
        _count: {
          select: {
            registrations: { where: { status: "REGISTERED" } },
            tasks: true,
            expenses: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const now = new Date();
    const caps = eventCaps(event, now);

    const isPresidentOwner = session?.userId === event.society.presidentId;
    const isAdmin = session?.role === "ADMIN";

    // Public visibility check from Event Status Table
    if (!caps.publicVisible && !isPresidentOwner && !isAdmin) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const registeredCount = event._count.registrations;
    const seatsRemaining = Math.max(0, event.capacity - registeredCount);

    let myRegistration = null;
    if (session && session.role === "STUDENT") {
      myRegistration = await prisma.registration.findUnique({
        where: { eventId_studentId: { eventId: params.id, studentId: session.userId } },
      });
    }

    return NextResponse.json({
      event: {
        ...event,
        registeredCount,
        seatsRemaining,
      },
      caps,
      myRegistration,
      isOwner: isPresidentOwner,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch event" },
      { status: err.status || 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    const body = await req.json();

    const parseResult = updateEventSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const d = parseResult.data;
    const updatePayload: any = {};
    if (d.title) updatePayload.title = d.title;
    if (d.description) updatePayload.description = d.description;
    if (d.venue) updatePayload.venue = d.venue;
    if (d.startAt) updatePayload.startAt = fromPKTInput(d.startAt);
    if (d.endAt) updatePayload.endAt = fromPKTInput(d.endAt);
    if (d.registrationDeadline) updatePayload.registrationDeadline = fromPKTInput(d.registrationDeadline);
    if (d.capacity !== undefined) updatePayload.capacity = d.capacity;
    if (d.proposedBudget !== undefined) updatePayload.proposedBudget = d.proposedBudget;

    const updated = await updateEvent(session.userId, params.id, updatePayload);
    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update event" },
      { status: err.status || 400 }
    );
  }
}


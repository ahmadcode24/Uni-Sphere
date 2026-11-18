export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createEvent } from "@/lib/services/event";
import { fromPKTInput } from "@/lib/time";

const createEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  venue: z.string().min(2, "Venue is required"),
  startAt: z.string().min(1, "Start time is required"),
  endAt: z.string().min(1, "End time is required"),
  registrationDeadline: z.string().min(1, "Registration deadline is required"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  proposedBudget: z.coerce.number().int().min(0, "Proposed budget must be >= 0"),
  submitForApproval: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const session = await requireUser(["PRESIDENT", "ADMIN"]);

    if (session.role === "ADMIN") {
      const events = await prisma.event.findMany({
        include: { society: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ events });
    }

    // President sees only own society events
    const society = await prisma.society.findUnique({
      where: { presidentId: session.userId },
    });

    if (!society) {
      return NextResponse.json({ events: [] });
    }

    const events = await prisma.event.findMany({
      where: { societyId: society.id },
      include: {
        _count: {
          select: {
            registrations: { where: { status: "REGISTERED" } },
            tasks: true,
            expenses: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ events });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch events" },
      { status: err.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    const body = await req.json();

    const parseResult = createEventSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const d = parseResult.data;
    // Always parse from PKT datetime-local string to UTC Date
    const startAt = fromPKTInput(d.startAt);
    const endAt = fromPKTInput(d.endAt);
    const registrationDeadline = fromPKTInput(d.registrationDeadline);

    const event = await createEvent(session.userId, {
      title: d.title,
      description: d.description,
      venue: d.venue,
      startAt,
      endAt,
      registrationDeadline,
      capacity: d.capacity,
      proposedBudget: d.proposedBudget,
      submitImmediately: d.submitForApproval !== false,
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create event" },
      { status: err.status || 400 }
    );
  }
}


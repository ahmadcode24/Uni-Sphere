import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getEventRegistrations } from "@/lib/services/registration";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT", "ADMIN"]);

    if (session.role === "PRESIDENT") {
      const event = await prisma.event.findUnique({
        where: { id: params.id },
        include: { society: true },
      });
      if (!event || event.society.presidentId !== session.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const registrations = await getEventRegistrations(params.id);
    return NextResponse.json({ registrations });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch registrations" },
      { status: err.status || 500 }
    );
  }
}

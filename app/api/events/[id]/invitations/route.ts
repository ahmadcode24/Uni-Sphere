import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { inviteVolunteer, getEventInvitations } from "@/lib/services/volunteer";

const inviteSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(["PRESIDENT", "ADMIN"]);
    const invitations = await getEventInvitations(params.id);
    return NextResponse.json({ invitations });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch invitations" },
      { status: err.status || 500 }
    );
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    const body = await req.json();

    const parseResult = inviteSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    const invitation = await inviteVolunteer(session.userId, params.id, parseResult.data.studentId);
    return NextResponse.json({ success: true, invitation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to send invitation" },
      { status: err.status || 400 }
    );
  }
}


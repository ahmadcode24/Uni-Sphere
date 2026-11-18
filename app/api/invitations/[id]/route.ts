import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { respondToInvitation, withdrawVolunteer } from "@/lib/services/volunteer";

const respondSchema = z.object({
  action: z.enum(["accept", "decline", "withdraw"]),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["STUDENT"]);
    const body = await req.json();

    const parseResult = respondSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Action must be accept, decline, or withdraw" }, { status: 400 });
    }

    if (parseResult.data.action === "withdraw") {
      const updated = await withdrawVolunteer(session.userId, params.id);
      return NextResponse.json({ success: true, invitation: updated });
    }

    const updated = await respondToInvitation(session.userId, params.id, parseResult.data.action);
    return NextResponse.json({ success: true, invitation: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to respond to invitation" },
      { status: err.status || 400 }
    );
  }
}


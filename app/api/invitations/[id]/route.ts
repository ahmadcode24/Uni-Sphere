import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { respondToInvitation } from "@/lib/services/volunteer";

const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["STUDENT"]);
    const body = await req.json();

    const parseResult = respondSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Action must be accept or decline" }, { status: 400 });
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


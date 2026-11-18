export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { manageMembership } from "@/lib/services/membership";

const manageMembershipSchema = z.object({
  action: z.enum(["approve", "reject", "remove", "label"]),
  label: z.enum(["MEMBER", "CORE"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    const body = await req.json();

    const parseResult = manageMembershipSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid action payload" },
        { status: 400 }
      );
    }

    const { action, label } = parseResult.data;
    const result = await manageMembership(session.userId, params.id, action, label);

    return NextResponse.json({ success: true, membership: result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update membership" },
      { status: err.status || 400 }
    );
  }
}


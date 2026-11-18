export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { decideCancellationRequest } from "@/lib/services/admin";

const cancelDecisionSchema = z.object({
  decision: z.enum(["APPROVE_CANCEL", "REJECT_CANCEL"]),
  remarks: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["ADMIN"]);
    const body = await req.json();

    const parseResult = cancelDecisionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid decision payload" },
        { status: 400 }
      );
    }

    const { decision, remarks } = parseResult.data;
    const event = await decideCancellationRequest(session.userId, params.id, decision, remarks);

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit cancellation decision" },
      { status: err.status || 400 }
    );
  }
}


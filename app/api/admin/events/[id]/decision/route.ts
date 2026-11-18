import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { decideEventProposal } from "@/lib/services/admin";

const decisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  remarks: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["ADMIN"]);
    const body = await req.json();

    const parseResult = decisionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid decision payload" },
        { status: 400 }
      );
    }

    const { decision, remarks } = parseResult.data;
    const event = await decideEventProposal(session.userId, params.id, decision, remarks);

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit decision" },
      { status: err.status || 400 }
    );
  }
}


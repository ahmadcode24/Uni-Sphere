export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requestEventCancellation } from "@/lib/services/event";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    let reason = "";
    try {
      const body = await req.json();
      reason = body.reason || "";
    } catch {
      // optional body
    }

    const event = await requestEventCancellation(session.userId, params.id, reason);
    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit cancellation request" },
      { status: err.status || 400 }
    );
  }
}


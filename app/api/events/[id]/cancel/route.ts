export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { cancelEvent } from "@/lib/services/event";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    const event = await cancelEvent(session.userId, params.id);
    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to cancel event" },
      { status: err.status || 400 }
    );
  }
}


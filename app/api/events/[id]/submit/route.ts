import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { submitEvent } from "@/lib/services/event";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    const event = await submitEvent(session.userId, params.id);
    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit event" },
      { status: err.status || 400 }
    );
  }
}


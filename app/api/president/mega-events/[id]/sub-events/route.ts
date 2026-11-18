import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSubEvent } from "@/lib/services/subevent";
import { AppError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PRESIDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const subEvent = await createSubEvent(session.userId, params.id, body);
    return NextResponse.json({ subEvent }, { status: 201 });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: err.message || "Failed to create sub-event" }, { status: 400 });
  }
}

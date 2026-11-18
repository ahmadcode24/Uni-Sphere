import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateSubEvent } from "@/lib/services/subevent";
import { AppError } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PRESIDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const subEvent = await updateSubEvent(session.id, params.id, body);
    return NextResponse.json({ subEvent });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || "Failed to update sub-event" }, { status: 400 });
  }
}

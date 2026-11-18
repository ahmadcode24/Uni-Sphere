import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPresidentMegaEvent } from "@/lib/services/subevent";
import { AppError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PRESIDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const megaEvent = await getPresidentMegaEvent(session.userId, params.id);
    return NextResponse.json({ megaEvent });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: err.message || "Failed to get Mega Event" }, { status: 500 });
  }
}

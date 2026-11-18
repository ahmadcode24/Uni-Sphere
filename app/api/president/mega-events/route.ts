import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listPresidentMegaEvents } from "@/lib/services/subevent";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PRESIDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const megaEvents = await listPresidentMegaEvents(session.id);
    return NextResponse.json({ megaEvents });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || "Failed to list Mega Events" }, { status: 500 });
  }
}

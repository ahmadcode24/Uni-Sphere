import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createMegaEvent, listAdminMegaEvents } from "@/lib/services/mega";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const megaEvents = await listAdminMegaEvents(session.id);
    return NextResponse.json({ megaEvents });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || "Failed to list Mega Events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const megaEvent = await createMegaEvent(session.id, body);
    return NextResponse.json({ megaEvent }, { status: 201 });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err.message || "Failed to create Mega Event" }, { status: 400 });
  }
}

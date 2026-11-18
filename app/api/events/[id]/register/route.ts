import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { registerForEvent } from "@/lib/services/registration";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["STUDENT"]);
    const result = await registerForEvent(params.id, session.userId);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to register" },
      { status: err.status || 400 }
    );
  }
}


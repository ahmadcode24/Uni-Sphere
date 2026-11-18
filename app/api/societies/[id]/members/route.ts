import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSocietyMembers } from "@/lib/services/membership";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    const members = await getSocietyMembers(session.userId, params.id);
    return NextResponse.json({ members });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch members" },
      { status: err.status || 400 }
    );
  }
}


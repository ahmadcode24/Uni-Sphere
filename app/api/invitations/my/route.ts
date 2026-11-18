export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getStudentInvitations } from "@/lib/services/volunteer";

export async function GET() {
  try {
    const session = await requireUser(["STUDENT"]);
    const invitations = await getStudentInvitations(session.userId);
    return NextResponse.json({ invitations });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch student invitations" },
      { status: err.status || 500 }
    );
  }
}


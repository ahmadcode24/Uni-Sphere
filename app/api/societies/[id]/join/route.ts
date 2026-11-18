import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requestMembership } from "@/lib/services/membership";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["STUDENT"]);
    const membership = await requestMembership(params.id, session.userId);
    return NextResponse.json({ success: true, membership });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to join society" },
      { status: err.status || 400 }
    );
  }
}

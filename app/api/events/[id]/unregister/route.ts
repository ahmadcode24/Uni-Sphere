import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { cancelRegistration } from "@/lib/services/registration";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["STUDENT"]);
    const result = await cancelRegistration(params.id, session.userId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to cancel registration" },
      { status: err.status || 400 }
    );
  }
}

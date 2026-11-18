export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getStudentTasks } from "@/lib/services/task";

export async function GET() {
  try {
    const session = await requireUser(["STUDENT"]);
    const tasks = await getStudentTasks(session.userId);
    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch student tasks" },
      { status: err.status || 500 }
    );
  }
}


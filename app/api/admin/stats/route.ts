export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAdminStats } from "@/lib/services/admin";

export async function GET() {
  try {
    await requireUser(["ADMIN"]);
    const stats = await getAdminStats();
    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch admin stats" },
      { status: err.status || 500 }
    );
  }
}


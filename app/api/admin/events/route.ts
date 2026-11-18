import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAdminMonitoring } from "@/lib/services/admin";

export async function GET(req: Request) {
  try {
    await requireUser(["ADMIN"]);
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || undefined;

    const events = await getAdminMonitoring(filter);
    return NextResponse.json({ events });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch events" },
      { status: err.status || 500 }
    );
  }
}


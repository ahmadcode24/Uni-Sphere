import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, requireUser } from "@/lib/auth";
import { getSocieties, createSociety, getPresidentSociety } from "@/lib/services/society";

const createSocietySchema = z.object({
  name: z.string().min(3, "Society name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  contactEmail: z.string().email("Valid contact email is required"),
  contactPhone: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const query = searchParams.get("query") || undefined;
    const my = searchParams.get("my");

    const session = await getSessionUser();

    // If president requests their own society
    if (my === "true" && session?.role === "PRESIDENT") {
      const society = await getPresidentSociety(session.userId);
      return NextResponse.json({ society });
    }

    const societies = await getSocieties({ category, query });
    return NextResponse.json({ societies });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch societies" },
      { status: err.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    const body = await req.json();

    const parseResult = createSocietySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const society = await createSociety(session.userId, parseResult.data);
    return NextResponse.json({ success: true, society }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create society" },
      { status: err.status || 400 }
    );
  }
}


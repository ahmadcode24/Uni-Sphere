import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, requireUser } from "@/lib/auth";
import { getSocietyById, updateSociety } from "@/lib/services/society";
import { getStudentMembership } from "@/lib/services/membership";

const updateSocietySchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  category: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    const society = await getSocietyById(params.id);

    let myMembership = null;
    if (session && session.role === "STUDENT") {
      myMembership = await getStudentMembership(params.id, session.userId);
    }

    return NextResponse.json({ society, myMembership });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch society" },
      { status: err.status || 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser(["PRESIDENT"]);
    const body = await req.json();

    const parseResult = updateSocietySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const updated = await updateSociety(session.userId, params.id, parseResult.data);
    return NextResponse.json({ success: true, society: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update society" },
      { status: err.status || 400 }
    );
  }
}

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildMegaMetrics } from "@/lib/services/megaMetrics";
import { generateMegaEventAiReport } from "@/lib/ai";
import { AppError } from "@/lib/errors";

// In-memory rate limiting map: userId -> lastRequestTimestamp
const rateLimitMap = new Map<string, number>();

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PRESIDENT") {
      return NextResponse.json({ error: "Unauthorized: President access required." }, { status: 401 });
    }

    // Rate-limit: one request per user per 10 seconds
    const now = Date.now();
    const lastRequest = rateLimitMap.get(session.userId) || 0;
    if (now - lastRequest < 10000) {
      const waitSeconds = Math.ceil((10000 - (now - lastRequest)) / 1000);
      return NextResponse.json(
        { error: `Rate limited: Please wait ${waitSeconds}s before requesting another AI analysis.` },
        { status: 429 }
      );
    }
    rateLimitMap.set(session.userId, now);

    // 1. Authoritative DB metrics calculation
    const metrics = await buildMegaMetrics(params.id, session.userId);

    // 2. Generate AI Operations Report
    const aiResult = await generateMegaEventAiReport(metrics);

    return NextResponse.json({
      metrics,
      report: aiResult.report,
      model: aiResult.model,
      unavailableReason: aiResult.unavailableReason || null,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json(
      { error: err.message || "Failed to generate AI operations report" },
      { status: 500 }
    );
  }
}

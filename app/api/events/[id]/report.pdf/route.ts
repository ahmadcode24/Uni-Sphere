export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/db";
import { getEventExpenses } from "@/lib/services/expense";
import { fmtPKT, fmtPKTDateOnly } from "@/lib/time";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const expenseData = await getEventExpenses(params.id);
    const { event, expenses, approvedBudget, totalSpent, remaining } = expenseData;

    const society = await prisma.society.findUnique({
      where: { id: (event as any).societyId || "" },
    });

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    // PDF Title
    doc
      .fontSize(22)
      .fillColor("#16202B")
      .text("UniSphere — Official Event Expense Report", { underline: true });

    doc.moveDown(0.5);
    doc.fontSize(14).fillColor("#0B7A55").text(event.title);
    doc.fontSize(10).fillColor("#555555").text(`Generated on ${new Date().toLocaleDateString()}`);

    doc.moveDown(1);
    doc.fontSize(12).fillColor("#16202B").text("Financial Summary", { bold: true } as any);
    doc.fontSize(10).text(`Sanctioned Budget: Rs ${approvedBudget.toLocaleString()} PKR`);
    doc.text(`Total Expenditure: Rs ${totalSpent.toLocaleString()} PKR`);
    doc.text(`Remaining Balance: Rs ${remaining.toLocaleString()} PKR ${remaining < 0 ? "(OVER BUDGET)" : ""}`);

    doc.moveDown(1.5);
    doc.fontSize(12).text("Itemized Expense Log", { bold: true } as any);
    doc.moveDown(0.5);

    // Table Header
    let y = doc.y;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Date", 50, y);
    doc.text("Title / Item", 150, y);
    doc.text("Amount (PKR)", 420, y, { align: "right" });
    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(9);
    expenses.forEach((item) => {
      const currentY = doc.y;
      doc.text(fmtPKTDateOnly(item.spentOn), 50, currentY);
      doc.text(item.title, 150, currentY, { width: 250 });
      doc.text(`Rs ${item.amount.toLocaleString()}`, 420, currentY, { align: "right" });
      doc.moveDown(0.8);
    });

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Expense_Report_${event.id}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}


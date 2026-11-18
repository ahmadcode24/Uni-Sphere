export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await requireUser(["PRESIDENT", "ADMIN"]);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WEBP, SVG." },
        { status: 400 }
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds 2MB limit." },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop() || "png";
    const filename = `society-logo-${session.userId}-${Date.now()}.${extension}`;

    // 1. If Vercel Blob token is set, upload to Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`logos/${filename}`, file, {
        access: "public",
      });
      return NextResponse.json({ success: true, url: blob.url });
    }

    // 2. Otherwise fall back to local public/uploads directory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, filename), buffer);

    return NextResponse.json({ success: true, url: `/uploads/${filename}` });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to upload file" },
      { status: err.status || 500 }
    );
  }
}


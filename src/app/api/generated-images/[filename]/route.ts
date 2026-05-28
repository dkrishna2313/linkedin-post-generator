import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  if (!/^[\w.-]+$/.test(filename)) {
    return NextResponse.json({ error: "Invalid filename." }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), "storage", "uploads", "generated-images", filename);
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType(filename),
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
}

function contentType(filename: string) {
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  if (filename.endsWith(".webp")) return "image/webp";
  return "image/png";
}

import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

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

export async function DELETE(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename: id } = await params;

  try {
    const image = await prisma.generatedImage.findUnique({
      where: { id },
      select: { id: true, imagePath: true }
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }

    await prisma.generatedImage.delete({ where: { id } });

    const filename = image.imagePath.split("/").pop();
    if (filename && /^[\w.-]+$/.test(filename)) {
      const filePath = path.join(process.cwd(), "storage", "uploads", "generated-images", filename);
      await unlink(filePath).catch(() => undefined);
    }

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Image could not be deleted." }, { status: 500 });
  }
}

function contentType(filename: string) {
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  if (filename.endsWith(".webp")) return "image/webp";
  return "image/png";
}

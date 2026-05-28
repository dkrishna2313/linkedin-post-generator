import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ingestPublicUrl } from "@/lib/ingestion/url";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = await prisma.source.findUnique({ where: { id } });

  if (!source?.url) {
    return NextResponse.json({ error: "This source does not have a URL to read." }, { status: 400 });
  }

  try {
    await prisma.source.update({ where: { id }, data: { status: "fetching", error: null } });
    const ingested = await ingestPublicUrl(source.url);
    const updated = await prisma.source.update({
      where: { id },
      data: {
        title: ingested.title ?? source.title,
        rawContent: ingested.rawContent,
        cleanContent: ingested.cleanContent,
        summary: ingested.summary,
        contentHash: crypto.createHash("sha256").update(ingested.cleanContent).digest("hex"),
        status: "parsed",
        error: null
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        summary: true,
        cleanContent: true,
        url: true,
        tags: true
      }
    });

    return NextResponse.json({ source: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "URL ingestion failed.";
    await prisma.source.update({ where: { id }, data: { status: "failed", error: message } });
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

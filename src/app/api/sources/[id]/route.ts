import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { inferSourceTags, inferSourceTitle } from "@/lib/sources/helpers";

export const dynamic = "force-dynamic";

const updateSourceSchema = z.object({
  type: z.string().trim().min(1).optional(),
  title: z.string().trim().optional(),
  url: z.string().trim().optional(),
  cleanContent: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  status: z.string().trim().min(1).optional(),
  tags: z.array(z.string()).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = updateSourceSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid source update." }, { status: 400 });
  }

  const input = parsed.data;
  const nextUrl = input.url || null;
  const nextCleanContent = input.cleanContent ?? "";
  const nextTitle = input.title || inferSourceTitle(nextCleanContent) || null;
  const tags = input.tags ?? inferSourceTags(`${input.type ?? ""} ${input.title ?? ""} ${nextUrl ?? ""} ${nextCleanContent}`);

  try {
    const source = await prisma.source.update({
      where: { id },
      data: {
        type: input.type,
        title: nextTitle,
        url: nextUrl,
        cleanContent: input.cleanContent,
        rawContent: input.cleanContent,
        summary: input.summary ?? (input.cleanContent ? input.cleanContent.slice(0, 280) : undefined),
        status: input.status,
        tags,
        contentHash: input.cleanContent
          ? crypto.createHash("sha256").update(`${input.type ?? ""}:${nextUrl ?? ""}:${input.cleanContent}`).digest("hex")
          : undefined
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

    return NextResponse.json({ source });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Source could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.source.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Source could not be deleted." }, { status: 500 });
  }
}

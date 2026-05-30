import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { inferSourceTags, inferSourceTitle } from "@/lib/sources/helpers";

const defaultWorkspaceId = "default-workspace";
export const dynamic = "force-dynamic";

const createSourceSchema = z.object({
  type: z.string().min(1),
  title: z.string().trim().optional().default(""),
  url: z.string().trim().optional().default(""),
  titleOrUrl: z.string().trim().optional().default(""),
  content: z.string().trim().optional().default(""),
  summary: z.string().trim().optional().default(""),
  keyThemes: z.string().trim().optional().default(""),
  status: z.enum(["queued", "draft"]).default("queued")
});

export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      where: { workspaceId: defaultWorkspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        summary: true,
        keyPoints: true,
        cleanContent: true,
        url: true,
        tags: true
      }
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sources could not be loaded.", sources: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = createSourceSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid source input." }, { status: 400 });
  }

  const { type, titleOrUrl, content, summary, keyThemes, status } = parsed.data;
  const fallbackIsUrl = /^https?:\/\//i.test(titleOrUrl);
  const title = parsed.data.title || (fallbackIsUrl ? undefined : titleOrUrl) || inferTitle(content);
  const url = parsed.data.url || (fallbackIsUrl ? titleOrUrl : undefined);

  if (!title && !url && !content) {
    return NextResponse.json({ error: "Add a URL, title, or pasted text before saving." }, { status: 400 });
  }

  try {
    await prisma.workspace.upsert({
      where: { id: defaultWorkspaceId },
      update: {},
      create: { id: defaultWorkspaceId, name: "Dilip LinkedIn Studio" }
    });

    const cleanContent = content;
    const contentHash = crypto.createHash("sha256").update(`${type}:${title ?? ""}:${url ?? ""}:${content}`).digest("hex");

    const source = await prisma.source.create({
      data: {
        workspaceId: defaultWorkspaceId,
        type,
        title,
        url,
        rawContent: content || null,
        cleanContent: cleanContent || null,
        summary: summary || cleanContent.slice(0, 280),
        keyPoints: keyThemes ? { keyThemes } : undefined,
        status,
        contentHash,
        tags: inferSourceTags(`${type} ${title ?? ""} ${url ?? ""} ${content}`)
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        summary: true,
        keyPoints: true,
        cleanContent: true,
        url: true,
        tags: true
      }
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Source could not be saved to the database." }, { status: 500 });
  }
}

const inferTitle = inferSourceTitle;

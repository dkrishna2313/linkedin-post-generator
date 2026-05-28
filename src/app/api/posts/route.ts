import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const defaultWorkspaceId = "default-workspace";

const createPostSchema = z.object({
  status: z.string().trim().min(1).default("draft"),
  title: z.string().trim().optional().default(""),
  body: z.string().trim().min(1),
  hook: z.string().trim().optional().default(""),
  hashtags: z.array(z.string()).default([]),
  firstComment: z.string().trim().optional().default(""),
  imageIdea: z.string().trim().optional().default(""),
  angle: z.string().trim().optional().default(""),
  sourceRefs: z.array(z.string()).optional().default([]),
  generatedImagePath: z.string().trim().optional().default(""),
  metadata: z.record(z.unknown()).optional().default({})
});

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      where: { workspaceId: defaultWorkspaceId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        title: true,
        body: true,
        hook: true,
        hashtags: true,
        firstComment: true,
        imageIdea: true,
        angle: true,
        createdAt: true,
        updatedAt: true,
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, createdAt: true }
        }
      }
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Posts could not be loaded.", posts: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = createPostSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Post body is required before saving." }, { status: 400 });
  }

  const input = parsed.data;

  try {
    await prisma.workspace.upsert({
      where: { id: defaultWorkspaceId },
      update: {},
      create: { id: defaultWorkspaceId, name: "Dilip LinkedIn Studio" }
    });

    const post = await prisma.post.create({
      data: {
        workspaceId: defaultWorkspaceId,
        status: input.status,
        title: input.title || input.hook || "Untitled draft",
        body: input.body,
        hook: input.hook || null,
        hashtags: input.hashtags,
        firstComment: input.firstComment || null,
        imageIdea: input.imageIdea || null,
        angle: input.angle || null,
        sourceRefs: input.sourceRefs,
        versions: {
          create: {
            body: input.body,
            metadata: {
              hook: input.hook,
              hashtags: input.hashtags,
              firstComment: input.firstComment,
              imageIdea: input.imageIdea,
              angle: input.angle,
              ...input.metadata
            }
          }
        }
      },
      select: {
        id: true,
        status: true,
        title: true,
        body: true,
        hook: true,
        hashtags: true,
        firstComment: true,
        imageIdea: true,
        angle: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (input.generatedImagePath) {
      await prisma.generatedImage.updateMany({
        where: {
          workspaceId: defaultWorkspaceId,
          imagePath: input.generatedImagePath,
          postId: null
        },
        data: { postId: post.id }
      });
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Draft could not be saved." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const updatePostSchema = z.object({
  status: z.string().trim().min(1).optional(),
  title: z.string().trim().optional(),
  body: z.string().trim().min(1).optional(),
  hook: z.string().trim().optional(),
  hashtags: z.array(z.string()).optional(),
  firstComment: z.string().trim().optional(),
  imageIdea: z.string().trim().optional(),
  angle: z.string().trim().optional(),
  generatedImagePath: z.string().trim().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.unknown()).optional().default({})
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [post, images] = await Promise.all([
      prisma.post.findUnique({
        where: { id },
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
          sourceRefs: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          versions: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              body: true,
              metadata: true,
              createdAt: true
            }
          }
        }
      }),
      prisma.generatedImage.findMany({
        where: { postId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          provider: true,
          model: true,
          prompt: true,
          imagePath: true,
          createdAt: true
        }
      })
    ]);

    if (!post) {
      return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    }

    return NextResponse.json({ post: { ...post, status: normalizePostStatus(post.status), images } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Draft could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = updatePostSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid draft update." }, { status: 400 });
  }

  const input = parsed.data;
  const nextStatus = input.status ? normalizePostStatus(input.status) : undefined;

  try {
    const existing = await prisma.post.findUnique({ where: { id }, select: { id: true, body: true } });

    if (!existing) {
      return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    }

    const nextBody = input.body ?? existing.body;

    const post = await prisma.post.update({
      where: { id },
      data: {
        status: nextStatus,
        title: input.title,
        body: input.body,
        hook: input.hook,
        hashtags: input.hashtags,
        firstComment: input.firstComment,
        imageIdea: input.imageIdea,
        angle: input.angle,
        publishedAt: input.publishedAt === undefined ? undefined : input.publishedAt ? new Date(input.publishedAt) : null,
        versions: {
          create: {
            body: nextBody,
            metadata: {
              title: input.title,
              hook: input.hook,
              hashtags: input.hashtags,
              firstComment: input.firstComment,
              imageIdea: input.imageIdea,
              angle: input.angle,
              status: nextStatus,
              publishedAt: input.publishedAt,
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
        publishedAt: true,
        updatedAt: true,
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            body: true,
            metadata: true,
            createdAt: true
          }
        }
      }
    });

    if (input.generatedImagePath) {
      await prisma.generatedImage.updateMany({
        where: {
          imagePath: input.generatedImagePath,
          postId: null
        },
        data: { postId: id }
      });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Draft could not be updated." }, { status: 500 });
  }
}

function normalizePostStatus(status: string) {
  return status === "edited" ? "draft" : status;
}

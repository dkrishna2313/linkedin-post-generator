import { NextResponse } from "next/server";
import { z } from "zod";
import { viewpoints as seedViewpoints } from "@/lib/data/seed";
import { prisma } from "@/lib/db/prisma";

const defaultWorkspaceId = "default-workspace";
export const dynamic = "force-dynamic";

const createViewpointSchema = z.object({
  title: z.string().trim().min(3, "Title is required."),
  description: z.string().trim().min(3, "Description is required."),
  framing: z.string().trim().optional().default(""),
  priority: z.number().int().min(0).max(100).optional()
});

export async function GET() {
  try {
    await ensureSeedViewpoints();

    const viewpoints = await prisma.viewpoint.findMany({
      where: { workspaceId: defaultWorkspaceId, active: true },
      orderBy: [{ priority: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        framing: true,
        priority: true,
        active: true
      }
    });

    return NextResponse.json({ viewpoints });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Viewpoints could not be loaded.", viewpoints: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = createViewpointSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid viewpoint input." }, { status: 400 });
  }

  try {
    await prisma.workspace.upsert({
      where: { id: defaultWorkspaceId },
      update: {},
      create: { id: defaultWorkspaceId, name: "Dilip LinkedIn Studio" }
    });

    const nextPriority =
      parsed.data.priority ??
      ((await prisma.viewpoint.aggregate({
        where: { workspaceId: defaultWorkspaceId },
        _max: { priority: true }
      }))._max.priority ?? 0) + 1;

    const viewpoint = await prisma.viewpoint.create({
      data: {
        workspaceId: defaultWorkspaceId,
        title: parsed.data.title,
        description: parsed.data.description,
        framing: parsed.data.framing || null,
        priority: nextPriority,
        active: true
      },
      select: {
        id: true,
        title: true,
        description: true,
        framing: true,
        priority: true,
        active: true
      }
    });

    return NextResponse.json({ viewpoint }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Viewpoint could not be saved." }, { status: 500 });
  }
}

async function ensureSeedViewpoints() {
  await prisma.workspace.upsert({
    where: { id: defaultWorkspaceId },
    update: {},
    create: { id: defaultWorkspaceId, name: "Dilip LinkedIn Studio" }
  });

  const count = await prisma.viewpoint.count({ where: { workspaceId: defaultWorkspaceId } });
  if (count > 0) return;

  await prisma.viewpoint.createMany({
    data: seedViewpoints.map((item, index) => ({
      workspaceId: defaultWorkspaceId,
      title: item.title,
      description: item.description,
      framing: item.framing,
      priority: index + 1,
      active: true
    }))
  });
}

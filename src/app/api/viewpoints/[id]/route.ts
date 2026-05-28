import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const updateViewpointSchema = z.object({
  title: z.string().trim().min(3).optional(),
  description: z.string().trim().min(3).optional(),
  framing: z.string().trim().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  active: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = updateViewpointSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid viewpoint update." }, { status: 400 });
  }

  try {
    const viewpoint = await prisma.viewpoint.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        title: true,
        description: true,
        framing: true,
        priority: true,
        active: true
      }
    });

    return NextResponse.json({ viewpoint });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Viewpoint could not be updated." }, { status: 500 });
  }
}

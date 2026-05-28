import { NextResponse } from "next/server";
import { z } from "zod";
import { refineMockDraft } from "@/lib/llm/mock";

const requestSchema = z.object({
  body: z.string().min(1),
  action: z.string().min(1)
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json(refineMockDraft(parsed.data.body, parsed.data.action));
}

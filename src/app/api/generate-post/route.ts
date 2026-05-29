import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMockDrafts } from "@/lib/llm/mock";
import { generateOpenAIDrafts } from "@/lib/llm/openai";
import { postGenerationSchema } from "@/lib/prompts/post";

const requestSchema = z.object({
  source: z.string().default(""),
  sourceReference: z.string().url().optional(),
  angle: z.string(),
  viewpoint: z.string(),
  sensitivity: z.string(),
  emojiUsage: z.enum(["none", "light", "moderate", "high"]).default("moderate"),
  count: z.number().int().min(1).max(5).default(3)
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const drafts =
      process.env.OPENAI_API_KEY && process.env.DEFAULT_TEXT_PROVIDER === "openai"
        ? await generateOpenAIDrafts(parsed.data)
        : generateMockDrafts(parsed.data);
    const result = postGenerationSchema.parse({ drafts });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Draft generation failed." },
      { status: 500 }
    );
  }
}

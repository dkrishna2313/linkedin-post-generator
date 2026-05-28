import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  postText: z.string().trim().min(1),
  imageIdea: z.string().trim().optional().default(""),
  style: z.string().trim().min(1),
  aspectRatio: z.string().trim().min(1),
  provider: z.string().trim().min(1),
  manualPrompt: z.string().trim().optional().default("")
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Post text is required before creating an image prompt." }, { status: 400 });
  }

  const { postText, imageIdea, style, aspectRatio, provider, manualPrompt } = parsed.data;
  const prompt = buildImagePrompt({ postText, imageIdea, style, aspectRatio, manualPrompt });

  return NextResponse.json({
    provider,
    model: provider === "openai" ? process.env.DEFAULT_IMAGE_MODEL || "gpt-image-1" : "provider default",
    aspectRatio,
    prompt,
    status: "prompt_ready"
  });
}

function buildImagePrompt(input: {
  postText: string;
  imageIdea: string;
  style: string;
  aspectRatio: string;
  manualPrompt: string;
}) {
  const source = input.postText.replace(/\s+/g, " ").slice(0, 900);
  const manual = input.manualPrompt ? `\nAdditional direction: ${input.manualPrompt}` : "";
  const idea = input.imageIdea || "Create a clean conceptual visual that supports the LinkedIn post.";

  return `Create a professional LinkedIn image.

Image concept:
${idea}

Style:
${input.style}

Aspect ratio:
${input.aspectRatio}

Content context:
${source}

Constraints:
- Clean, executive-friendly, and modern.
- Minimal text in the image.
- No fake logos, no Deloitte branding, and no claim of official publication.
- Avoid cheesy stock-photo tropes.
- Prefer simple visual metaphors, diagrams, or abstract business imagery.${manual}`;
}

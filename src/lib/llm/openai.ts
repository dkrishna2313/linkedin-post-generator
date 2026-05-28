import OpenAI from "openai";
import { buildPostPrompt, postGenerationSchema, type GeneratedDraft } from "@/lib/prompts/post";

export async function generateOpenAIDrafts(input: {
  source: string;
  sourceReference?: string;
  angle: string;
  viewpoint: string;
  sensitivity: string;
  emojiUsage: "none" | "light" | "moderate";
  count: number;
}): Promise<GeneratedDraft[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey });
  const result = await client.chat.completions.create({
    model: process.env.DEFAULT_TEXT_MODEL || "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a precise LinkedIn writing assistant. Return valid JSON only and ground every draft in the supplied source content."
      },
      { role: "user", content: buildPostPrompt(input) }
    ]
  });

  const content = result.choices[0]?.message.content;
  if (!content) {
    throw new Error("The text provider returned no content.");
  }

  const drafts = postGenerationSchema.parse(JSON.parse(content)).drafts;
  return drafts.map((draft) => enforceReferenceAtEnd(draft, input.sourceReference));
}

export function enforceReferenceAtEnd(draft: GeneratedDraft, url?: string) {
  if (!url) return draft;

  const bodyWithoutReference = draft.post_body
    .split("\n")
    .filter((line) => !line.includes(url))
    .join("\n")
    .trim();

  return {
    ...draft,
    post_body: `${bodyWithoutReference}\n\nSource: ${url}`,
    source_references: [url]
  };
}

import OpenAI from "openai";
import { buildPostPrompt, postGenerationSchema, type EmojiUsage, type GeneratedDraft } from "@/lib/prompts/post";

export async function generateOpenAIDrafts(input: {
  source: string;
  sourceReference?: string;
  angle: string;
  viewpoint: string;
  sensitivity: string;
  emojiUsage: EmojiUsage;
  count: number;
}): Promise<GeneratedDraft[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey, timeout: 60000 });
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

  const drafts = postGenerationSchema.parse(normalizeDraftResponse(JSON.parse(content))).drafts;
  return drafts.map((draft, index) =>
    enforcePostBodyEmoji(enforceReferenceAtEnd(draft, input.sourceReference), input.emojiUsage, index)
  );
}

export function enforceReferenceAtEnd(draft: GeneratedDraft, url?: string) {
  const bodyWithoutReference = draft.post_body
    .split("\n")
    .filter((line) => !/^Source:\s*/i.test(line.trim()))
    .join("\n")
    .trim();

  if (!url) {
    return {
      ...draft,
      post_body: bodyWithoutReference,
      source_references: []
    };
  }

  return {
    ...draft,
    post_body: `${bodyWithoutReference}\n\nSource: ${url}`,
    source_references: [url]
  };
}

function normalizeDraftResponse(value: unknown) {
  if (!value || typeof value !== "object" || !("drafts" in value)) {
    return value;
  }

  const response = value as { drafts: unknown };
  if (!Array.isArray(response.drafts)) {
    return value;
  }

  return {
    ...response,
    drafts: response.drafts.map((draft) => {
      if (!draft || typeof draft !== "object") {
        return draft;
      }

      const item = draft as Record<string, unknown>;

      return {
        ...item,
        hashtags: normalizeStringArray(item.hashtags),
        source_references: normalizeStringArray(item.source_references),
        confidence_score:
          typeof item.confidence_score === "string" ? Number(item.confidence_score) : item.confidence_score
      };
    })
  };
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value;
}

function enforcePostBodyEmoji(
  draft: GeneratedDraft,
  emojiUsage: EmojiUsage,
  index: number
): GeneratedDraft {
  if (emojiUsage === "none" || (emojiUsage !== "high" && containsEmoji(draft.post_body))) {
    return draft;
  }

  const emojis = emojiUsage === "high" ? ["💡", "🔍", "⚖️"] : [["💡", "🔍", "⚖️", "🧠"][index % 4]];
  const lines = draft.post_body.split("\n");
  const sourceLineIndex = lines.findIndex((line) => /^Source:\s*/i.test(line.trim()));
  const insertionIndex = sourceLineIndex === -1 ? lines.length - 1 : Math.max(sourceLineIndex - 1, 0);

  lines[insertionIndex] = `${lines[insertionIndex].trimEnd()} ${emojis.join(" ")}`;

  return {
    ...draft,
    post_body: lines.join("\n")
  };
}

function containsEmoji(value: string) {
  return /[\p{Extended_Pictographic}]/u.test(value);
}

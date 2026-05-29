import { z } from "zod";

export const generatedDraftSchema = z.object({
  hook: z.string(),
  post_body: z.string(),
  hashtags: z.array(z.string()).min(3).max(5),
  first_comment: z.string(),
  image_idea: z.string(),
  angle: z.string(),
  viewpoint_used: z.string(),
  sensitive_topic_notes: z.string(),
  source_references: z.array(z.string()),
  tone_notes: z.string(),
  confidence_score: z.number().min(0).max(1)
});

export const postGenerationSchema = z.object({
  drafts: z.array(generatedDraftSchema).min(1).max(5)
});

export type EmojiUsage = "none" | "light" | "moderate" | "high";
export type GeneratedDraft = z.infer<typeof generatedDraftSchema>;

export function buildPostPrompt(input: {
  source: string;
  sourceReference?: string;
  angle: string;
  viewpoint: string;
  sensitivity: string;
  emojiUsage: EmojiUsage;
  count: number;
}) {
  return `Generate ${input.count} concise LinkedIn drafts.

Voice:
- Short, punchy, practical, executive-friendly.
- Avoid generic AI hype and corporate filler.
- Emoji usage: ${input.emojiUsage}. Never use decorative clutter.
- If emoji usage is light, include 1 appropriate emoji in post_body.
- If emoji usage is moderate, include 1 to 3 appropriate emojis across the hook and post_body, with at least 1 in post_body.
- If emoji usage is high, include 3 to 5 appropriate emojis across the hook and post_body, with multiple emojis in post_body while keeping the writing professional.
- If emoji usage is none, do not use emojis in the hook, post_body, first_comment, or image_idea.
- Synthesize the source content; do not quote or repeat source metadata mechanically.
- If a source URL is supplied, include it only once, as the final line of post_body in this format: Source: URL.
- If no source URL is supplied, do not add a Source line.
- Never place a URL in the hook or in the middle of post_body.

Angle: ${input.angle}
Viewpoint: ${input.viewpoint}
Sensitive topic guidance: ${input.sensitivity}
Source URL for final reference: ${input.sourceReference || "None supplied"}

Source material:
${input.source}

Return strict JSON with a "drafts" array. Each draft must contain:
hook, post_body, hashtags (3 to 5 items), first_comment, image_idea, angle,
viewpoint_used, sensitive_topic_notes, source_references, tone_notes, confidence_score.
source_references must always be an array of strings. If a source URL is supplied, set source_references to an array containing that URL and end post_body with its Source line. If no source URL is supplied, source_references must be an empty array.`;
}

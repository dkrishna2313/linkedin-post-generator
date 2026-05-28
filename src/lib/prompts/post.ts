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

export type GeneratedDraft = z.infer<typeof generatedDraftSchema>;

export function buildPostPrompt(input: {
  source: string;
  sourceReference?: string;
  angle: string;
  viewpoint: string;
  sensitivity: string;
  emojiUsage: "none" | "light" | "moderate";
  count: number;
}) {
  return `Generate ${input.count} concise LinkedIn drafts.

Voice:
- Short, punchy, practical, executive-friendly.
- Avoid generic AI hype and corporate filler.
- Emoji usage: ${input.emojiUsage}. Use at most 3 appropriate emojis and never decorative clutter.
- Synthesize the source content; do not quote or repeat source metadata mechanically.
- Include the source URL only once, as the final line of post_body in this format: Source: URL.
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
If a source URL is supplied, set source_references to that URL and end post_body with its Source line.`;
}

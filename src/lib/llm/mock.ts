import type { EmojiUsage, GeneratedDraft } from "@/lib/prompts/post";
import { enforceReferenceAtEnd } from "@/lib/llm/openai";

const hashtagsByAngle: Record<string, string[]> = {
  "Contrarian take": ["#AITransformation", "#Leadership", "#OperatingModel"],
  "Executive summary": ["#AI", "#Strategy", "#FutureOfWork"],
  "Personal reflection": ["#Leadership", "#Innovation", "#AIAdoption"],
  "Deloitte-style insight": ["#BusinessTransformation", "#AI", "#OperatingModel"],
  "Question-led post": ["#AILeadership", "#Transformation", "#Workforce"],
  "Practical lesson": ["#Execution", "#AIAdoption", "#ChangeManagement"],
  "Framework post": ["#Strategy", "#AITransformation", "#BusinessModel"],
  "Trend observation": ["#FutureOfWork", "#AI", "#TechnologyAdoption"],
  "What this means for leaders": ["#Leadership", "#AITransformation", "#Reskilling"],
  "Carousel outline": ["#LinkedInCarousel", "#AI", "#Leadership"],
  "Story-driven post": ["#Leadership", "#Innovation", "#AI"]
};

export function generateMockDrafts(input: {
  source: string;
  sourceReference?: string;
  angle: string;
  viewpoint: string;
  sensitivity: string;
  emojiUsage?: EmojiUsage;
  count?: number;
}): GeneratedDraft[] {
  const count = Math.min(Math.max(input.count ?? 3, 1), 5);
  const sourceSignal = input.source.trim().split(/\s+/).slice(0, 12).join(" ");
  const hashtags = hashtagsByAngle[input.angle] ?? ["#AI", "#Leadership", "#Transformation"];
  const emojiUsage = input.emojiUsage ?? "light";

  return Array.from({ length: count }, (_, index) => {
    const accent = emojiAccent(index, emojiUsage);
    const openingAccent = emojiUsage === "moderate" || emojiUsage === "high" ? `${accent} ` : "";
    const closingAccent = emojiUsage === "none" ? "" : emojiUsage === "high" ? ` ${accent} 🚀 ✅` : ` ${accent}`;

    return enforceReferenceAtEnd({
    hook: `${openingAccent}${[
      "The hard part of AI transformation is not the model.",
      "AI strategy breaks when the operating model stays untouched.",
      "The next advantage in AI may be commercial, not technical.",
      "Leaders need a transition plan, not just a tool roadmap.",
      "Entrepreneurial thinking is becoming a core leadership skill."
    ][index] ?? "AI adoption needs sharper leadership choices."}`,
    post_body: `${openingAccent}The hard part of AI transformation is rarely the demo.\n\nIt is the set of choices around ownership, workflow redesign, incentives, and commercial fit.\n\n${sourceSignal ? `The source material points to this: ${sourceSignal}.` : "That is where many programs lose momentum."}\n\n${input.viewpoint}\n\nThe better question for leaders is not \"what can we automate?\"\n\nIt is: what work should change, who is affected, and how do we make the transition responsibly?${closingAccent}`,
    hashtags,
    first_comment:
      "A useful test: if an AI initiative has no owner for adoption, workflow redesign, and benefits capture, it is probably still a technology project.",
    image_idea:
      "A clean LinkedIn visual showing three connected layers: AI capability, operating model change, and commercial value.",
    angle: input.angle,
    viewpoint_used: input.viewpoint,
    sensitive_topic_notes: input.sensitivity,
    source_references: input.sourceReference ? [input.sourceReference] : sourceSignal ? ["Provided source material"] : ["Original idea"],
    tone_notes: `Short paragraphs, practical framing, ${emojiUsage} emoji usage, and a leadership-oriented close.`,
    confidence_score: 0.82 - index * 0.03
    }, input.sourceReference);
  });
}

export function refineMockDraft(body: string, action: string) {
  const additions: Record<string, string> = {
    "Make punchier": "Tightened the pacing and made the hook more direct.",
    "Make more executive": "Raised the framing toward leadership decisions and value capture.",
    "Make more personal": "Added more first-person reflection and judgment.",
    "Make more contrarian": "Sharpened the contrast against common AI assumptions.",
    "Add more nuance": "Added caveats on workforce impact, reskilling, and uneven sector effects.",
    "Reduce jargon": "Simplified phrasing and removed corporate filler.",
    "Add emojis": "Added light emoji accents.",
    "Remove emojis": "Removed emoji usage.",
    Shorten: "Reduced length while preserving the main insight.",
    Expand: "Expanded the supporting argument.",
    "Add sharper hook": "Rewrote the opening line for more tension."
  };

  const noEmojiBody = body.replace(/\s*[💡🔍⚖️🧠]\s*/gu, " ").replace(/[ \t]+\n/g, "\n").trim();
  const revisedBody =
    action === "Add sharper hook"
      ? `Most AI programs do not fail in the lab. They fail in the business.\n\n${body}`
      : action === "Add emojis"
        ? body.match(/[💡🔍⚖️🧠]/u)
          ? body
          : `${body.trim()} 💡`
        : action === "Remove emojis"
          ? noEmojiBody
          : body;

  return {
    revised_draft: revisedBody,
    explanation: additions[action] ?? `Applied refinement: ${action}.`,
    hashtags: ["#AITransformation", "#Leadership", "#OperatingModel"],
    first_comment: "The adoption model is often the strategy.",
    image_idea: "Minimal executive diagram linking adoption, workflow redesign, and measurable value."
  };
}

function emojiAccent(index: number, usage: EmojiUsage) {
  if (usage === "none") return "";
  return ["💡", "🔍", "⚖️", "🧠"][index % 4];
}

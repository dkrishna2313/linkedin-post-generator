import OpenAI from "openai";
import { buildSourceSummaryPrompt } from "@/lib/prompts/source-summary";

export async function summarizeSourceContent(input: {
  title?: string | null;
  url?: string;
  content: string;
  fallbackSummary: string;
}) {
  if (!process.env.OPENAI_API_KEY || process.env.DEFAULT_TEXT_PROVIDER !== "openai") {
    return input.fallbackSummary;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: process.env.DEFAULT_TEXT_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You summarize extracted article text. You are careful to ignore page chrome and only summarize the article's substantive content."
        },
        {
          role: "user",
          content: buildSourceSummaryPrompt(input)
        }
      ]
    });

    return response.choices[0]?.message.content?.trim() || input.fallbackSummary;
  } catch (error) {
    console.error(error);
    return input.fallbackSummary;
  }
}

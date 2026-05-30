import OpenAI from "openai";
import { buildSourceKeyThemesPrompt, buildSourceSummaryPrompt } from "@/lib/prompts/source-summary";

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

export async function generateSourceKeyThemes(input: {
  title?: string | null;
  url?: string;
  content: string;
  fallbackSummary: string;
}) {
  if (!process.env.OPENAI_API_KEY || process.env.DEFAULT_TEXT_PROVIDER !== "openai") {
    return fallbackKeyThemes(input.fallbackSummary || input.content);
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
            "You extract key themes from article text. You ignore page chrome and focus only on substantive article content."
        },
        {
          role: "user",
          content: buildSourceKeyThemesPrompt(input)
        }
      ]
    });

    return response.choices[0]?.message.content?.trim() || fallbackKeyThemes(input.fallbackSummary || input.content);
  } catch (error) {
    console.error(error);
    return fallbackKeyThemes(input.fallbackSummary || input.content);
  }
}

function fallbackKeyThemes(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences
    .slice(0, 6)
    .map((sentence) => `- ${sentence.replace(/\s+/g, " ").trim().replace(/^[-•]\s*/, "")}`)
    .join("\n")
    .slice(0, 1200);
}

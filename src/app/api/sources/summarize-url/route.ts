import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestPublicUrl } from "@/lib/ingestion/url";
import { summarizeSourceContent } from "@/lib/llm/source-summary";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  url: z.string().trim().url()
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid public URL to summarize." }, { status: 400 });
  }

  try {
    const ingested = await ingestPublicUrl(parsed.data.url);
    const summary = await summarizeSourceContent({
      title: ingested.title,
      url: parsed.data.url,
      content: ingested.cleanContent,
      fallbackSummary: ingested.summary
    });
    return NextResponse.json({ source: { ...ingested, summary } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "URL could not be summarized." },
      { status: 422 }
    );
  }
}

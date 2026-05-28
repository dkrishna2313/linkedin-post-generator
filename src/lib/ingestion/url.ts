import { load } from "cheerio";

export type IngestedUrl = {
  title: string | null;
  rawContent: string;
  cleanContent: string;
  summary: string;
};

export async function ingestPublicUrl(url: string): Promise<IngestedUrl> {
  assertPublicHttpUrl(url);

  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "LinkedInPostGenerator/1.0 (article ingestion)",
      Accept: "text/html,application/xhtml+xml"
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`Could not retrieve URL (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error("URL does not return an HTML article.");
  }

  const html = await response.text();
  const $ = load(html);
  $("script, style, noscript, svg, nav, header, footer, aside, form").remove();

  const title =
    cleanText($("meta[property='og:title']").attr("content") ?? "") ||
    cleanText($("title").first().text()) ||
    null;
  const articleCandidate = $("article").first().text() || $("main").first().text() || $("body").text();
  const cleanContent = cleanText(articleCandidate).slice(0, 30000);

  if (cleanContent.length < 120) {
    throw new Error("Could not extract enough readable article content from the URL.");
  }

  return {
    title,
    rawContent: html.slice(0, 100000),
    cleanContent,
    summary: summarizeText(cleanContent)
  };
}

function summarizeText(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences
    .slice(0, 4)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function assertPublicHttpUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP or HTTPS URLs are supported.");
  }

  const blockedHostnames = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
  const hostname = url.hostname.toLowerCase();
  if (
    blockedHostnames.has(hostname) ||
    hostname.endsWith(".local") ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new Error("Private or local URLs cannot be ingested.");
  }
}

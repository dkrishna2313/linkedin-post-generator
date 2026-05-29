export function buildSourceSummaryPrompt(input: { title?: string | null; url?: string; content: string }) {
  return `Summarize the actual article content below for later LinkedIn post generation.

Rules:
- Ignore surrounding website chrome: navigation, menus, cookie banners, ads, newsletter prompts, related links, sidebars, footers, captions, share buttons, author bios, and legal boilerplate.
- Ignore repeated page labels, table-of-contents text, SEO fragments, and unrelated recommendation widgets.
- Focus only on the article's substantive thesis, arguments, evidence, examples, and implications.
- Do not summarize the website, publication, or page structure.
- Preserve nuance and caveats.
- Return 4-6 concise bullets plus one "Why it matters" sentence.
- Do not include markdown tables.

Title: ${input.title || "Unknown"}
URL: ${input.url || "Unknown"}

Extracted page text:
${input.content.slice(0, 24000)}`;
}

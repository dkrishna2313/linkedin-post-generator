export function inferSourceTitle(content: string) {
  return content.split(/\n/).find((line) => line.trim().length > 0)?.trim().slice(0, 80) || undefined;
}

export function inferSourceTags(text: string) {
  const lower = text.toLowerCase();
  const tags = [
    ["ai", "AI"],
    ["operating model", "operating model"],
    ["commercial", "commercial model"],
    ["leadership", "leadership"],
    ["reskilling", "reskilling"],
    ["future of work", "future of work"]
  ]
    .filter(([needle]) => lower.includes(needle))
    .map(([, tag]) => tag);

  return Array.from(new Set(tags)).slice(0, 5);
}

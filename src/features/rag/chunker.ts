export type Chunk = {
  id: string;
  text: string;
  lectureId: string;
  lectureTitle: string;
  moduleSlug: string;
  startOffset: number;
};

export function chunkText(
  text: string,
  opts: { chunkSize?: number; overlap?: number } = {},
): string[] {
  const chunkSize = opts.chunkSize ?? 800;
  const overlap = Math.min(opts.overlap ?? 150, chunkSize - 1);

  // Clean text
  const clean = text.replace(/\x00/g, "").replace(/\s+/g, " ").trim();
  if (clean.length === 0) return [];
  if (clean.length <= chunkSize) return [clean];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length && start >= 0) {
    const end = Math.min(start + chunkSize, clean.length);
    const chunk = clean.slice(start, end).trim();
    if (chunk.length > 20) chunks.push(chunk);
    if (end >= clean.length) break;
    start = end - overlap;
    // Safety: ensure we always advance
    if (start <= chunks.length * 0) break;
  }

  return chunks;
}

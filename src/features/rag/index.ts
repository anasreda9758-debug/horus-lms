import postgres from "postgres";
import { chunkText, type Chunk } from "./chunker";
import { BM25Index } from "./search";

let globalIndex: BM25Index | null = null;
let indexBuiltAt = 0;
const REBUILD_INTERVAL = 10 * 60 * 1000;

export async function getRAGIndex(): Promise<BM25Index> {
  if (globalIndex && Date.now() - indexBuiltAt < REBUILD_INTERVAL) {
    return globalIndex;
  }
  return rebuildIndex();
}

export async function rebuildIndex(): Promise<BM25Index> {
  const client = postgres(process.env.DATABASE_URL ?? "postgres://postgres:lms_dev@localhost:5432/lms");

  const meta = await client`
    SELECT l.id as lid, l.title as ltitle, m.slug as mslug
    FROM lecture l JOIN module m ON m.id = l.module_id
    WHERE length(l.content) > 100 ORDER BY l.id
  `;

  const allChunks: Chunk[] = [];
  let chunkId = 0;

  for (const m of meta) {
    const [row] = await client`SELECT content FROM lecture WHERE id = ${m.lid}`;
    if (!row?.content) continue;

    const content = (row.content as string).replace(/\x00/g, "").slice(0, 5000);
    const pieces = chunkText(content, { chunkSize: 600, overlap: 100 });
    for (const piece of pieces) {
      allChunks.push({
        id: `c${chunkId++}`,
        text: piece,
        lectureId: m.lid as string,
        lectureTitle: m.ltitle as string,
        moduleSlug: m.mslug as string,
        startOffset: 0,
      });
    }
  }

  await client.end();

  const index = new BM25Index();
  index.build(allChunks);
  globalIndex = index;
  indexBuiltAt = Date.now();

  console.log(`[RAG] Index built: ${allChunks.length} chunks from ${meta.length} lectures`);
  return index;
}

export function retrieve(
  index: BM25Index,
  query: string,
  opts?: { topK?: number; moduleSlug?: string },
): { chunk: Chunk; score: number }[] {
  let results = index.search(query, opts?.topK ?? 8);
  if (opts?.moduleSlug) {
    results = results.filter((r) => r.chunk.moduleSlug === opts.moduleSlug);
  }
  return results;
}

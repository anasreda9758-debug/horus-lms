import type { Chunk } from "./chunker";

// Simple BM25 implementation for medical education RAG
// No external dependencies — pure JS

type TermStats = {
  docFreq: number;
  postings: Map<number, number>;
};

const K1 = 1.5;
const B = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, " ") // keep Arabic + alphanumeric
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "as", "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "and", "but", "or", "nor", "not", "so", "very", "just",
  "than", "too", "also", "that", "this", "these", "those", "it", "its",
  "which", "who", "whom", "what", "where", "when", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no",
  "only", "own", "same", "here", "there", "why", "how", "if", "about",
  // Arabic common stop words
  "من", "في", "على", "إلى", "عن", "مع", "هذا", "هذه", "التي", "الذي",
  "أن", "إن", "لا", "ما", "هل", "قد", "كان", "هو", "هي", "يكون",
  "أنها", "أنه", "ولم", "ولا", "بل", "أو", "ثم", "كيف", "ماذا",
]);

export class BM25Index {
  private chunks: Chunk[] = [];
  private index: Map<string, TermStats> = new Map();
  private docLengths: number[] = [];
  private avgDocLength = 0;
  private totalDocs = 0;

  build(chunks: Chunk[]) {
    this.chunks = chunks;
    this.totalDocs = chunks.length;
    this.index.clear();
    this.docLengths = [];

    let totalLength = 0;

    for (let docId = 0; docId < chunks.length; docId++) {
      const tokens = tokenize(chunks[docId].text);
      this.docLengths.push(tokens.length);
      totalLength += tokens.length;

      const termFreqs = new Map<string, number>();
      for (const token of tokens) {
        termFreqs.set(token, (termFreqs.get(token) ?? 0) + 1);
      }

      for (const [term, freq] of termFreqs) {
        if (!this.index.has(term)) {
          this.index.set(term, { docFreq: 0, postings: new Map() });
        }
        const stats = this.index.get(term)!;
        stats.docFreq++;
        stats.postings.set(docId, freq);
      }
    }

    this.avgDocLength = totalLength / (chunks.length || 1);
  }

  search(query: string, topK = 5): { chunk: Chunk; score: number }[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const scores = new Map<number, number>();

    for (const token of queryTokens) {
      const stats = this.index.get(token);
      if (!stats) continue;

      const idf = Math.log(
        (this.totalDocs - stats.docFreq + 0.5) / (stats.docFreq + 0.5) + 1,
      );

      for (const [docId, tf] of stats.postings) {
        const dl = this.docLengths[docId];
        const numerator = tf * (K1 + 1);
        const denominator = tf + K1 * (1 - B + B * (dl / this.avgDocLength));
        const score = idf * (numerator / denominator);
        scores.set(docId, (scores.get(docId) ?? 0) + score);
      }
    }

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([docId, score]) => ({ chunk: this.chunks[docId], score }));
  }

  get size() {
    return this.chunks.length;
  }
}

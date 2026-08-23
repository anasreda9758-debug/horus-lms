/**
 * Proposes per-lecture PDF page ranges for shared term books.
 * Usage:
 *   npx tsx scripts/propose-pdf-ranges.ts              # preview only
 *   npx tsx scripts/propose-pdf-ranges.ts --apply      # write ranges to DB
 *   npx tsx scripts/propose-pdf-ranges.ts --file=semester 2/CVS/CVS.pdf
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import postgres from "postgres";

const require_ = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse = require_("pdf-parse") as any;

const APPLY = process.argv.includes("--apply");
const CONTENT_ROOT = process.env.CONTENT_ROOT ?? "C:/work/projects";
const fileArg = process.argv.find((a) => a.startsWith("--file="));
const ONLY_FILE = fileArg ? fileArg.slice("--file=".length) : null;

const sql = postgres("postgres://postgres:lms_dev@localhost:5432/lms");

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  const stop = new Set(["of", "the", "and", "in", "to", "a", "an", "for", "with"]);
  return normalize(s).split(" ").filter((t) => t.length > 2 && !stop.has(t));
}

type PageDoc = {
  num: number;
  norm: string;
  headings: string;
  lines: string[];
};

async function extractPages(filePath: string): Promise<PageDoc[]> {
  const buf = readFileSync(join(CONTENT_ROOT, filePath));
  const pages: string[] = [];
  await pdfParse(buf, {
    pagerender: async (pageData: any) => {
      const tc = await pageData.getTextContent();
      let lastY: number | null = null;
      let text = "";
      for (const item of tc.items) {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) text += "\n";
        else if (text.length > 0 && !text.endsWith(" ")) text += " ";
        text += String(item.str ?? "");
        lastY = item.transform[5];
      }
      pages.push(text);
      return text;
    },
  });
  return pages.map((p, i) => {
    const lines = p.split("\n").map((l) => normalize(l)).filter((l) => l.length > 3);
    return {
      num: i + 1,
      norm: normalize(p),
      headings: normalize(lines.slice(0, 4).join(" ")),
      lines,
    };
  });
}

/**
 * Segments a compiled slide-deck book: running headers are the lines that
 * repeat across MANY pages. Per page we pick its highest-frequency line;
 * boundaries where that dominant header changes.
 */
function segmentByRunningTitles(pages: PageDoc[]) {
  const freq = new Map<string, number>();
  for (const p of pages) {
    const seen = new Set<string>();
    for (const l of p.lines) {
      if (l.length < 8 || l.length > 80) continue;
      if (seen.has(l)) continue;
      seen.add(l);
      freq.set(l, (freq.get(l) ?? 0) + 1);
    }
  }
  const threshold = Math.max(4, Math.floor(pages.length * 0.015));
  const isHeader = (l: string) => (freq.get(l) ?? 0) >= threshold;

  type Run = { header: string; start: number; end: number };
  const raw: Run[] = [];
  for (let i = 0; i < pages.length; i++) {
    let best = "";
    let bestF = 0;
    for (const l of pages[i].lines) {
      if (!isHeader(l)) continue;
      const f = freq.get(l) ?? 0;
      // prefer higher frequency; tie-break by earlier position in the page (top)
      if (f > bestF || (f === bestF && best === "")) {
        best = l;
        bestF = f;
      }
    }
    if (!best) continue;
    const last = raw[raw.length - 1];
    if (last && last.header === best) last.end = i + 1;
    else raw.push({ header: best, start: i + 1, end: i + 1 });
  }

  // merge same-header runs separated by short gaps
  const merged: Run[] = [];
  for (const r of raw) {
    const prev = merged[merged.length - 1];
    if (prev && prev.header === r.header && r.start - prev.end <= 6) prev.end = r.end;
    else merged.push({ ...r });
  }

  return merged.filter((r) => r.end - r.start + 1 >= 3);
}

function titleTokens(s: string): string[] {
  const stop = new Set(["of", "the", "and", "in", "to", "a", "an", "for", "with", "&", "on"]);
  return normalize(s)
    .split(" ")
    .filter((t) => t.length > 2 && !stop.has(t));
}

function matchScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let n = 0;
  for (const t of a) if (b.includes(t)) n++;
  return n / Math.max(a.length, b.length);
}

function scoreMatch(titleTok: string[], page: PageDoc): number {
  if (titleTok.length === 0) return 0;
  let body = 0;
  let head = 0;
  for (const t of titleTok) {
    if (page.norm.includes(t)) body++;
    if (page.headings.includes(t)) head++;
  }
  const bodyScore = body / titleTok.length;
  const headBonus = titleTok.length ? head / titleTok.length : 0;
  return bodyScore * 0.6 + headBonus * 0.4;
}

// Build a keyword fingerprint from a lecture's stored content (more
// discriminative than its short title).
function fingerprintFromContent(content: string | null, title: string): string[] {
  const source = content && content.length > 200 ? content.slice(0, 6000) : title;
  const stop = new Set([
    "the", "and", "for", "with", "are", "from", "this", "that", "which", "into", "when", "than",
    "these", "those", "have", "has", "had", "can", "may", "will", "not", "but", "all", "any",
    "also", "its", "his", "her", "their", "them", "they", "been", "were", "was", "more", "most",
    "such", "other", "some", "each", "both", "after", "before", "between", "during", "under",
    "over", "then", "there", "here", "where", "while", "about", "above", "below", "very", "only",
  ]);
  const counts = new Map<string, number>();
  for (const t of normalize(source).split(" ")) {
    if (t.length < 4 || stop.has(t) || /^\d+$/.test(t)) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .map(([t]) => t);
}

function scoreFingerprint(fp: string[], page: PageDoc): { score: number; head: number } {
  if (fp.length === 0) return { score: 0, head: 0 };
  let body = 0;
  let head = 0;
  for (const t of fp) {
    if (page.norm.includes(t)) body++;
    if (page.headings.includes(t)) head++;
  }
  return { score: body / fp.length, head };
}

async function main() {
  const lectures = await sql`
    SELECT l.id, l.title, l.pdf_file, l.content, m.slug AS module_slug
    FROM lecture l JOIN module m ON m.id = l.module_id
    WHERE l.pdf_file IS NOT NULL
    ORDER BY l.pdf_file, l."order", l.title
  `;

  // group by pdf_file, keep only files shared by >1 lecture
  type Lec = { id: string; title: string; moduleSlug: string; order: number; fp: string[]; consumed?: boolean };
  const byFile = new Map<string, Lec[]>();
  let order = 0;
  for (const l of lectures) {
    const arr = byFile.get(l.pdf_file) ?? [];
    arr.push({
      id: l.id,
      title: l.title,
      moduleSlug: l.module_slug,
      order: order++,
      fp: fingerprintFromContent(l.content, l.title),
    });
    byFile.set(l.pdf_file, arr);
  }
  const shared = [...byFile.entries()].filter(([f, ls]) => ls.length > 1 && (!ONLY_FILE || f === ONLY_FILE));

  const proposal: Record<string, { id: string; start: number | null; end: number | null }> = {};

  for (const [file, lecs] of shared) {
    console.log(`\n=== ${file} (${lecs.length} lectures) ===`);
    let pages: PageDoc[];
    try {
      pages = await extractPages(file);
    } catch (e: any) {
      console.log(`  !! cannot parse PDF: ${e.message}`);
      continue;
    }
    console.log(`  ${pages.length} pages extracted`);

    // Structural segmentation by running headers
    const segments = segmentByRunningTitles(pages);
    console.log(`  ${segments.length} segments detected`);

    // Greedy assignment: best-scoring (segment, lecture) pairs first
    type Pair = { segIdx: number; lec: Lec; score: number };
    const pairs: Pair[] = [];
    for (let si = 0; si < segments.length; si++) {
      const segTok = titleTokens(segments[si].header);
      for (const l of lecs) {
        if (l.consumed) continue;
        const score = matchScore(segTok, titleTokens(l.title));
        pairs.push({ segIdx: si, lec: l, score });
      }
    }
    pairs.sort((a, b) => b.score - a.score);

    const segTaken = new Set<number>();
    const lecSeg = new Map<string, { start: number; end: number }>();
    for (const p of pairs) {
      if (p.score < 0.34 || segTaken.has(p.segIdx) || lecSeg.has(p.lec.id)) continue;
      // segment must not already be covered by an earlier (higher-score) lecture
      const s = segments[p.segIdx];
      lecSeg.set(p.lec.id, { start: s.start, end: s.end });
      segTaken.add(p.segIdx);
      p.lec.consumed = true;
    }

    for (const [id, r] of [...lecSeg.entries()]) {
      proposal[id] = { id, start: r.start, end: r.end };
    }
    for (const l of lecs) {
      if (!lecSeg.has(l.id)) {
        console.log(`  ~ no match: "${l.title}"`);
        proposal[l.id] = { id: l.id, start: null, end: null };
      }
    }
    for (let si = 0; si < segments.length; si++) {
      const owner = [...lecSeg.entries()].find(([, r]) => r.start === segments[si].start);
      console.log(
        `  p${segments[si].start}-${segments[si].end}  "${segments[si].header}" -> ${owner ? owner[0] : "(unused)"}`,
      );
    }
  }

  const outPath = join(process.cwd(), "scripts", "pdf-ranges-proposal.json");
  writeFileSync(outPath, JSON.stringify(proposal, null, 2));
  const count = Object.keys(proposal).length;
  console.log(`\n${count} proposals -> ${outPath}`);

  if (APPLY) {
    let applied = 0;
    for (const p of Object.values(proposal)) {
      if (p.start && p.end) {
        await sql`UPDATE lecture SET pdf_page_start = ${p.start}, pdf_page_end = ${p.end}, updated_at = now() WHERE id = ${p.id}`;
        applied++;
      }
    }
    console.log(`APPLIED ranges to ${applied} lectures.`);
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

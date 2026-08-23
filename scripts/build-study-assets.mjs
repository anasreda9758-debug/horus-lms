// Offline study-asset pipeline (no LLM required):
//   Phase 1: extract per-lecture text from its PDF page range (fixes the
//            duplicated-content problem where every lecture sharing a book
//            had the same first N chars stored).
//   Phase 2: build a hierarchical mindmap JSON from extracted headings and
//            store it in lecture.mindmap_json (only where still NULL).
//   Phase 3: render an SVG summary card per lecture into public/study-cards.
//
// Scope rules for Phase 1:
//   - lecture has pdf_page_start  -> extract exactly that page range
//   - pdf_file used by ONE lecture -> whole file belongs to it
//   - pdf_file shared but no range -> skipped (needs admin ranges first)

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import postgres from "postgres";

const require_ = createRequire(import.meta.url);
const ROOT = process.env.CONTENT_ROOT ?? "C:/work/projects";
const DB = process.env.DATABASE_URL ?? "postgres://postgres:lms_dev@localhost:5432/lms";
const CARDS_DIR = resolve("public/study-cards");

const sql = postgres(DB, { max: 3 });

// ── PDF text extraction (pdf.js legacy build, node-safe) ─────────────────────

let pdfjs;
async function getPdfjs() {
  if (!pdfjs) {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjs;
}

async function extractPages(absPath, fromPage, toPage) {
  const lib = await getPdfjs();
  const data = new Uint8Array(readFileSync(absPath));
  const doc = await lib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;

  const start = Math.max(1, fromPage);
  const end = Math.min(toPage ?? doc.numPages, doc.numPages);
  const chunks = [];

  for (let p = start; p <= end; p++) {
    try {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      let text = "";
      let lastY = null;
      for (const item of tc.items) {
        if (!item.str) continue;
        const y = item.transform?.[5] ?? 0;
        if (lastY !== null && Math.abs(y - lastY) > 2) text += "\n";
        else if (text && !text.endsWith("\n") && !text.endsWith(" ")) text += " ";
        text += item.str;
        lastY = y;
      }
      chunks.push(text.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim());
      page.cleanup();
    } catch {
      // unreadable page — skip
    }
  }
  await doc.destroy();
  return chunks.filter(Boolean);
}

// ── Heading heuristics ───────────────────────────────────────────────────────

const JUNK =
  /(horus university|faculty of medicine|staff members|department of|semester\s*\d|^page\b|^\d{1,3}$|^Dr\.?\s|^prof\.?|^أ\.?د\.?|all rights reserved|www\.|@|http)/i;

function looksLikeHeading(line) {
  const s = line.trim();
  if (s.length < 4 || s.length > 95) return false;
  if (JUNK.test(s)) return false;
  if (/[.,;:]$/.test(s)) return false;
  if (/^\d+\s+slide/i.test(s)) return false;
  const letters = s.replace(/[^A-Za-z\u0600-\u06FF]/g, "");
  if (letters.length < 3) return false;
  const upperRatio =
    letters.replace(/[\u0600-\u06FF]/g, "").length === 0
      ? 0
      : (letters.match(/[A-Z]/g) ?? []).length /
        Math.max(1, letters.replace(/[\u0600-\u06FF]/g, "").length);
  const hasLatin = /[A-Za-z]/.test(s);
  if (hasLatin && upperRatio >= 0.65) return true;          // ALL-CAPS TITLE
  if (/^([IVXivx]{1,6}|\d+)([.)])\s+\S/.test(s) && s.length < 70) return true;
  if (/^(chapter|section|unit|lecture|review|summary|introduction|definition|causes|symptoms|signs|treatment|diagnosis|complications|management|pathophysiology|etiology|classification|types|functions|anatomy|histology|physiology|pharmacology)\b/i.test(s))
    return true;
  if (/^[\u0600-\u06FF]/.test(s) && s.length <= 60 && !/[.؟!]$/.test(s) && s.split(" ").length <= 9)
    return true;                                             // short Arabic line
  return false;
}

function buildMindmap(title, text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const headings = [];
  lines.forEach((line, i) => {
    if (!looksLikeHeading(line)) return;
    const prev = lines[i - 1] ?? "";
    const next = lines[i + 1] ?? "";
    // a real heading tends to sit near body text, not isolated noise
    if (prev.length > 0 || next.length > 0) headings.push(line);
  });

  // de-noise: drop near-duplicates and pure numbers
  const seen = new Set();
  const clean = [];
  for (const h of headings) {
    const key = h.toLowerCase().replace(/[^a-z\u0600-\u06ff]/g, "");
    if (!key || key.length < 4 || seen.has(key)) continue;
    seen.add(key);
    clean.push(h);
  }

  const rootChildren = [];
  const MAX_SECTIONS = 7;
  for (let i = 0; i < clean.length && rootChildren.length < MAX_SECTIONS; i++) {
    const label = clean[i];
    // collect following heading lines until next candidate becomes too far
    const subs = [];
    for (let j = i + 1; j < Math.min(i + 6, clean.length) && subs.length < 4; j++) {
      if (clean[j].length <= label.length * 2.2) subs.push(clean[j]);
    }
    rootChildren.push(
      subs.length ? { label, children: subs.map((s) => ({ label: s })) } : { label },
    );
  }

  // Fallback: proportional chunks of the text
  if (rootChildren.length < 3) {
    const sentences = text
      .split(/(?<=[.!?۔])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && s.length < 140);
    const step = Math.max(1, Math.floor(sentences.length / 5));
    rootChildren.length = 0;
    for (let i = 0; i < sentences.length && rootChildren.length < 5; i += step) {
      const raw = sentences[i].replace(/\s+/g, " ");
      const label = raw.length > 80 ? raw.slice(0, 77) + "…" : raw;
      rootChildren.push({ label });
    }
  }

  return { label: title.slice(0, 90), children: rootChildren };
}

// ── SVG summary cards ────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wrapRtl(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur.trim());
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur.trim());
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{3}$/, "…");
  }
  return lines;
}

const PALETTE = ["#38bdf8", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#22d3ee"];

function renderCard({ title, moduleName, sections }) {
  const accent = PALETTE[[...(moduleName || "x")].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  const W = 1200;
  const H = 630;
  const titleLines = wrapRtl(title, 42, 2);
  const rows = [];
  const listX = W - 70;
  let y = 268;
  for (const s of sections.slice(0, 5)) {
    rows.push(`<circle cx="${listX + 8}" cy="${y - 8}" r="7" fill="${accent}"/>`);
    const lines = wrapRtl(s.label, 62, 1);
    rows.push(
      `<text x="${listX}" y="${y}" text-anchor="end" font-size="27" fill="#e2e8f0" font-weight="600">${esc(lines[0] ?? "")}</text>`,
    );
    y += 56;
    if (y > H - 90) break;
  }

  const titleSpans = titleLines
    .map(
      (l, i) =>
        `<tspan x="${W - 70}" dy="${i === 0 ? 0 : 52}">${esc(l)}</tspan>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1220"/>
      <stop offset="1" stop-color="#16233b"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="36" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" rx="36" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="2"/>
  <rect x="0" y="0" width="${W}" height="10" rx="5" fill="${accent}"/>
  <rect x="${W - 70 - esc(moduleName).length * 13 - 44}" y="52" width="${esc(moduleName).length * 13 + 44}" height="52" rx="26" fill="${accent}" fill-opacity="0.14"/>
  <text x="${W - 92}" y="86" text-anchor="end" font-size="26" fill="${accent}" font-weight="700">${esc(moduleName)}</text>
  <text x="${W - 70}" y="190" text-anchor="end" font-size="${titleLines.some((l) => l.length > 30) ? 40 : 46}" fill="#ffffff" font-weight="800">${titleSpans}</text>
  ${rows.join("\n  ")}
  <text x="${W - 70}" y="${H - 42}" text-anchor="end" font-size="22" fill="#64748b">Horus MED · ملخص المحاضرة</text>
</svg>`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(CARDS_DIR, { recursive: true });

  const lectures = await sql`
    SELECT l.id, l.slug, l.title, l.pdf_file, l.pdf_page_start, l.pdf_page_end,
           l.content, l.mindmap_json, m.name AS module_name
    FROM lecture l JOIN module m ON m.id = l.module_id
    ORDER BY m."order", l."order"
  `;
  console.log(`lectures: ${lectures.length}`);

  // Which pdf files are shared between multiple lectures?
  const usage = new Map();
  for (const l of lectures) {
    if (!l.pdf_file) continue;
    usage.set(l.pdf_file, (usage.get(l.pdf_file) ?? 0) + 1);
  }

  const docCache = new Map(); // absPath -> { numPages }
  let extracted = 0;
  let mapped = 0;
  let carded = 0;
  let skippedShared = 0;

  for (const l of lectures) {
    // ---- Phase 1: best available source text ------------------------------
    let text = null;
    let trusted = false; // false => content is unscoped/duplicated, skip derived assets
    if (l.pdf_file) {
      const absPath = resolve(ROOT, l.pdf_file);
      const shared = (usage.get(l.pdf_file) ?? 0) > 1;
      try {
        if (l.pdf_page_start && existsSync(absPath)) {
          const parts = await extractPages(absPath, l.pdf_page_start, l.pdf_page_end);
          text = parts.join("\n\n");
          trusted = true;
        } else if (!shared && existsSync(absPath)) {
          if (!docCache.has(absPath)) {
            const lib = await getPdfjs();
            const data = new Uint8Array(readFileSync(absPath));
            const doc = await lib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, disableFontFace: true }).promise;
            docCache.set(absPath, { numPages: doc.numPages });
            await doc.destroy();
          }
          const parts = await extractPages(absPath, 1, docCache.get(absPath).numPages);
          text = parts.join("\n\n");
          trusted = true;
        } else if (shared) {
          skippedShared++;
        }
      } catch (err) {
        console.error(`  ✗ extract ${l.title}: ${err.message}`);
      }
    }
    if (!text && !l.pdf_file && l.content && l.content.trim().length > 100) {
      text = l.content;
      trusted = true;
    }

    // Persist corrected content when we have a proper scope
    if (text && l.pdf_page_start && text !== l.content) {
      const clipped = text.slice(0, 400_000);
      await sql`UPDATE lecture SET content = ${clipped}, updated_at = now() WHERE id = ${l.id}`;
      extracted++;
    }

    // Unscoped shared-book lectures must not keep assets derived from
    // duplicated content — clear any stale map/card for them.
    if (l.pdf_file && !l.pdf_page_start && (usage.get(l.pdf_file) ?? 0) > 1) {
      await sql`UPDATE lecture SET mindmap_json = NULL, updated_at = now() WHERE id = ${l.id} AND mindmap_json IS NOT NULL`;
      try { unlinkSync(join(CARDS_DIR, `${l.slug}.svg`)); } catch {}
      continue;
    }

    // ---- Phase 2: mindmap --------------------------------------------------
    if (text && trusted && !l.mindmap_json) {
      const map = buildMindmap(l.title, text.slice(0, 60_000));
      if (map.children.length >= 3) {
        await sql`
          UPDATE lecture SET mindmap_json = ${sql.json(map)}::jsonb, updated_at = now()
          WHERE id = ${l.id} AND mindmap_json IS NULL
        `;
        mapped++;
      }
    }

    // ---- Phase 3: SVG card -------------------------------------------------
    if (text && trusted) {
      const map = buildMindmap(l.title, text.slice(0, 20_000));
      const sections = (map.children ?? []).slice(0, 5);
      if (sections.length) {
        const svg = renderCard({
          title: l.title,
          moduleName: l.module_name ?? "",
          sections,
        });
        writeFileSync(join(CARDS_DIR, `${l.slug}.svg`), svg, "utf8");
        carded++;
      }
    }
  }

  console.log(`\ndone. content-updated: ${extracted}, mindmaps-created: ${mapped}, cards: ${carded}, skipped-shared-no-range: ${skippedShared}`);
  await sql.end();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

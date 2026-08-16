import "dotenv/config";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/shared/db";
import { question, questionBank, questionOption } from "../src/features/practice/schema";

const DATA_DIR = "scripts/data";

const MARK = "\u2705";

type ParsedQuestion = {
  prompt: string;
  options: string[];
  answerIdx?: number;
  explanation?: string;
};

function clean(s: string): string {
  return s.replace(/\u2705/g, "").replace(/[ \t]+/g, " ").trim();
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPrompt(p: string): string {
  let s = p
    .replace(/^LEVEL\s*\d+\s*[-–]\s*SEMESTER?\s*\d+\s*/i, "")
    .replace(/^[0-9]+\s*/, "")
    .trim();
  // strip leading mojibake tokens (arabic garbage)
  s = s.replace(/^[\s\u0600-\u06FF؟؟\u0000-\u001F]+/, "").trim();
  return s;
}

function isNoise(s: string): boolean {
  if (!s) return true;
  if (/^[0-9]+$/.test(s)) return true;
  if (/^--\s*\d+\s+of\s+\d+\s*--$/.test(s)) return true;
  if (/^(MCQ|ESSAY|WRITTEN|OSPE|FORMATIVE|FINAL|MIDTERM|MODULE|Contents)/i.test(s) && s.length < 50) return true;
  const alpha = (s.match(/[A-Za-z]/g) || []).length;
  if (s.length > 3 && alpha === 0) return true;
  return false;
}

// ---------- Numbered format (resp) ----------
function parseNumbered(text: string): ParsedQuestion[] {
  const lines = text.split(/\r?\n/);
  const qs: ParsedQuestion[] = [];
  let cur: ParsedQuestion | null = null;
  for (const raw of lines) {
    const line = clean(raw);
    if (!line || isNoise(line)) continue;
    const qm = line.match(/^(\d+)[-–.)]\s*(.+)$/);
    const om = line.match(/^([a-eA-E])\)\s*(.+)$/);
    if (qm && !om) {
      if (cur) qs.push(cur);
      cur = { prompt: cleanPrompt(qm[2]), options: [] };
      continue;
    }
    if (om && cur) {
      const idx = "abcde".indexOf(om[1].toLowerCase());
      cur.options[idx] = om[2];
      continue;
    }
    if (cur) {
      const lastOpt = cur.options.length - 1;
      if (cur.options.length === 0) cur.prompt += " " + line;
      else cur.options[lastOpt] += " " + line;
    }
  }
  if (cur) qs.push(cur);
  return qs;
}

// ---------- Free-form format (ibl, module3) ----------
function parseFreeForm(text: string): ParsedQuestion[] {
  const lines = text.split(/\r?\n/);
  const qs: ParsedQuestion[] = [];
  let buffer: string[] = [];
  let markedIndex: number | undefined;
  let seenOptions = false;

  const flush = () => {
    const promptLines: string[] = [];
    const opts: string[] = [];
    let curOpt = -1;
    for (const raw of buffer) {
      const line = clean(raw);
      if (!line) continue;
      const om = line.match(/^([a-eA-E])\)\s*(.+)$/);
      if (om) {
        curOpt = "abcde".indexOf(om[1].toLowerCase());
        opts[curOpt] = om[2];
      } else if (curOpt >= 0) {
        opts[curOpt] += " " + line;
      } else if (!isNoise(line)) {
        promptLines.push(line);
      }
    }
    if (opts.length >= 3 && promptLines.join(" ").trim().length > 0) {
      qs.push({
        prompt: cleanPrompt(promptLines.join(" ").trim()),
        options: opts.filter((o) => o !== undefined),
        answerIdx: markedIndex,
      });
    }
    buffer = [];
    markedIndex = undefined;
  };

  for (const raw of lines) {
    const line = clean(raw);
    if (!line || isNoise(line)) continue;
    const om = line.match(/^([a-eA-E])\)\s*(.+)$/);
    if (om) {
      if (raw.includes(MARK)) markedIndex = "abcde".indexOf(om[1].toLowerCase());
      buffer.push(raw);
      seenOptions = true;
      continue;
    }
    if (seenOptions) {
      flush();
      seenOptions = false;
    }
    buffer.push(raw);
  }
  flush();
  return qs;
}

// ---------- answer-keys ----------
type Key = { section: string; letter: string; answer: string; explanation?: string; flagged: boolean };
function parseAnswerKeys(text: string): Key[] {
  const out: Key[] = [];
  let section = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const h = line.match(/^##+\s+(.+)$/);
    if (h) { section = h[1]; continue; }
    const flagged = line.includes("\u26A0") || line.includes("⚠");
    const m = line.match(/^\s*\d+\.\s+(.+?)\s*→\s*\*{0,2}\s*([A-Ea-e])\)\s*(.+?)\*{0,2}\s*(?:\(.*)?$/);
    if (m) {
      let answer = clean(m[3]);
      let explanation: string | undefined;
      const paren = answer.match(/^(.*?)\s*\((.*)\)$/);
      if (paren) {
        answer = clean(paren[1]);
        explanation = paren[2];
      }
      out.push({ section, letter: m[2].toUpperCase(), answer: norm(answer), explanation, flagged });
    }
  }
  return out;
}

// questions documented as defective in the source — exclude from banks
const EXCLUDED_PROMPTS = [
  "antigenic drift",
  "not a virulence factor of b. pertussis",
  "mhc expression",
  "autoimmune disorders may involve",
];

function isExcluded(q: ParsedQuestion): boolean {
  const p = norm(q.prompt);
  return EXCLUDED_PROMPTS.some((x) => p.includes(x));
}

function matchAnswer(q: ParsedQuestion, keys: Key[]): number | undefined {
  const idxHits = new Set<number>();
  for (const k of keys) {
    if (k.answer.length < 3) continue;
    if (k.flagged) continue;
    let idx = q.options.findIndex((o) => norm(o).includes(k.answer));
    if (idx < 0) idx = q.options.findIndex((o) => k.answer.includes(norm(o)) && norm(o).length > 3);
    if (idx >= 0) idxHits.add(idx);
  }
  if (idxHits.size === 1) return [...idxHits][0];
  return undefined;
}

function dedupe(qs: ParsedQuestion[]): ParsedQuestion[] {
  const seen = new Set<string>();
  return qs.filter((q) => {
    const k = norm(q.prompt) + "|" + q.options.map(norm).join("|");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------- seed ----------
async function seedBank(opts: {
  moduleSlug: string;
  bankSlug: string;
  bankTitle: string;
  questions: ParsedQuestion[];
  overwrite?: boolean;
}) {
  const mod = await db.query.curriculumModule.findFirst({
    where: (m, { eq }) => eq(m.slug, opts.moduleSlug),
  });
  if (!mod) {
    console.error(`[seed-quiz] module '${opts.moduleSlug}' not found`);
    return;
  }

  const existing = await db.query.questionBank.findFirst({
    where: (b, { eq }) => eq(b.slug, opts.bankSlug),
  });
  let bankId: string;
  if (existing) {
    if (!opts.overwrite) {
      console.log(`[seed-quiz] bank '${opts.bankSlug}' already exists (${opts.questions.length} incoming) — skipping`);
      return;
    }
    bankId = existing.id;
    const qIds = await db.select({ id: question.id }).from(question).where(eq(question.bankId, bankId));
    if (qIds.length > 0) {
      await db.delete(questionOption).where(inArray(questionOption.questionId, qIds.map((r) => r.id)));
    }
    await db.delete(question).where(eq(question.bankId, bankId));
    console.log(`[seed-quiz] bank '${opts.bankSlug}' cleared (${opts.questions.length} incoming)`);
  } else {
    bankId = randomUUID();
    await db.insert(questionBank).values({
      id: bankId,
      moduleId: mod.id,
      slug: opts.bankSlug,
      title: opts.bankTitle,
    });
  }

  let inserted = 0;
  for (const q of opts.questions) {
    if (!q.options || q.options.length < 2) continue;
    if (q.answerIdx === undefined || q.answerIdx < 0 || q.answerIdx >= q.options.length) continue;
    const questionId = randomUUID();
    await db.insert(question).values({
      id: questionId,
      bankId,
      prompt: q.prompt,
      explanation: q.explanation ?? null,
      order: inserted + 1,
    });
    for (const [oi, text] of q.options.entries()) {
      await db.insert(questionOption).values({
        id: randomUUID(),
        questionId,
        text: clean(text),
        isCorrect: oi === q.answerIdx,
        order: oi + 1,
      });
    }
    inserted += 1;
  }
  console.log(`[seed-quiz] bank '${opts.bankSlug}' → ${inserted} questions`);
}

async function main() {
  const [respText, iblText, m3Text, keysText] = await Promise.all([
    readFile(`${DATA_DIR}/resp-mcqs.txt`, "utf8"),
    readFile(`${DATA_DIR}/ibl-mcqs.txt`, "utf8"),
    readFile(`${DATA_DIR}/module3-past-exams.txt`, "utf8"),
    readFile(`${DATA_DIR}/answer-keys.md`, "utf8"),
  ]);
  const keys = parseAnswerKeys(keysText);
  console.log("[seed-quiz] answer-keys entries:", keys.length);

  // resp: numbered + answer-key matching
  const respAll = parseNumbered(respText);
  const respQ = dedupe(
    respAll
      .filter((q) => q.options.length >= 2)
      .map((q) => ({ ...q, answerIdx: matchAnswer(q, keys) }))
      .filter((q) => q.answerIdx !== undefined && !isExcluded(q)),
  );
  console.log("[seed-quiz] resp parsed:", respAll.length, "→ usable:", respQ.length);

  // ibl: free-form + answer-key matching
  const iblAll = parseFreeForm(iblText);
  const iblQ = dedupe(
    iblAll
      .filter((q) => q.options.length >= 2)
      .map((q) => ({ ...q, answerIdx: matchAnswer(q, keys) }))
      .filter((q) => q.answerIdx !== undefined && !isExcluded(q)),
  );
  console.log("[seed-quiz] ibl parsed:", iblAll.length, "→ usable:", iblQ.length);

  // module3: free-form with in-file ✅ marks
  const m3All = parseFreeForm(m3Text);
  const m3Q = dedupe(m3All.filter((q) => q.answerIdx !== undefined && q.options.length >= 2));
  console.log("[seed-quiz] module3 parsed:", m3All.length, "→ usable:", m3Q.length);

  // sanity sample before writing
  console.log("\n--- samples ---");
  const show = (q: ParsedQuestion, tag: string) => {
    console.log(`[${tag}] ${q.prompt}`);
    q.options.forEach((o, i) => console.log(`    ${"abcde"[i]}) ${o}${i === q.answerIdx ? "  <<ANS>>" : ""}`));
  };
  show(respQ[0], "resp");
  show(respQ[Math.floor(respQ.length / 2)], "resp");
  show(iblQ[0], "ibl");
  show(iblQ[Math.floor(iblQ.length / 2)], "ibl");
  show(m3Q[0], "m3");
  show(m3Q[Math.floor(m3Q.length / 2)], "m3");

  // dump full parsed output to file for manual audit
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    "scripts/data/_parsed-preview.json",
    JSON.stringify(
      {
        resp: respQ.map((q) => ({ p: q.prompt, o: q.options, a: q.answerIdx })),
        ibl: iblQ.map((q) => ({ p: q.prompt, o: q.options, a: q.answerIdx })),
        m3: m3Q.map((q) => ({ p: q.prompt, o: q.options, a: q.answerIdx })),
      },
      null,
      1,
    ),
    "utf8",
  );
  console.log("[seed-quiz] wrote scripts/data/_parsed-preview.json for audit");

  if (process.env.SEED_DRY_RUN === "1") {
    console.log("\n[seed-quiz] DRY RUN — no writes");
    return;
  }

  await seedBank({
    moduleSlug: "rs-201",
    bankSlug: "rs-comprehensive",
    bankTitle: "الجهاز التنفسي — بنك أسئلة شامل (امتحانات حقيقية)",
    questions: respQ,
    overwrite: true,
  });
  await seedBank({
    moduleSlug: "ibl-204",
    bankSlug: "ibl-immunology",
    bankTitle: "المناعة والدم — بنك أسئلة شامل (امتحانات حقيقية)",
    questions: iblQ,
    overwrite: true,
  });
  await seedBank({
    moduleSlug: "pmb-103",
    bankSlug: "pmb-pathology",
    bankTitle: "الباثولوجي — بنك أسئلة شامل (امتحانات حقيقية)",
    questions: m3Q,
    overwrite: true,
  });

  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-quiz] error:", err);
  process.exit(1);
});

import "dotenv/config";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, extname, join, relative, resolve } from "node:path";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  academicYear,
  faculty,
  program,
  semester,
  subject,
  university,
} from "@/features/hierarchy/schema";
import { curriculumModule, lecture } from "@/features/curriculum/schema";

const require_ = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse = require_("pdf-parse") as any;

const CONTENT_ROOT = resolve(process.env.CONTENT_ROOT ?? "C:/work/projects");
const REPORTS_DIR = resolve(process.cwd(), "reports");
const JSON_REPORT_PATH = join(REPORTS_DIR, "content-mapping-audit.json");
const MD_REPORT_PATH = join(REPORTS_DIR, "content-mapping-audit.md");

type Confidence = "HIGH" | "MEDIUM" | "LOW";

type DbLecture = {
  id: string;
  title: string;
  slug: string;
  moduleId: string;
  moduleSlug: string;
  moduleName: string;
  pdfFile: string | null;
  pdfPageStart: number | null;
  pdfPageEnd: number | null;
  order: number;
};

type DetectedBoundary = {
  page: number;
  marker: string;
  score: number;
};

type CandidateLectureMapping = {
  lectureId: string | null;
  lectureTitle: string;
  startPage: number | null;
  endPage: number | null;
  confidence: Confidence;
  evidence: string[];
  ambiguous: boolean;
  databaseLectureId: string | null;
};

type PdfAudit = {
  absolutePath: string;
  relativePath: string;
  filename: string;
  sizeBytes: number;
  pageCount: number | null;
  textExtractable: boolean;
  scannedOrImageOnly: boolean;
  moduleCandidates: string[];
  inferredModule: string | null;
  appearsMultiLecture: boolean;
  boundaries: DetectedBoundary[];
  lectureMappings: CandidateLectureMapping[];
  problems: string[];
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(s: string): string[] {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "into",
    "that",
    "this",
    "lecture",
    "lect",
    "module",
    "week",
    "part",
    "dr",
    "prof",
  ]);
  return norm(s)
    .split(" ")
    .filter((w) => w.length > 2 && !stop.has(w));
}

function listPdfs(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir) continue;
    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (e.isFile() && extname(e.name).toLowerCase() === ".pdf") out.push(full);
    }
  }
  return out.sort();
}

async function readPdfPages(pdfPath: string): Promise<{ pageCount: number | null; pages: string[]; error?: string }> {
  try {
    const pageTexts: string[] = [];
    const data = statSync(pdfPath);
    if (!data.isFile()) return { pageCount: null, pages: [], error: "Not a file" };
    const buffer = require_("node:fs").readFileSync(pdfPath);
    const parsed = await pdfParse(buffer, {
      pagerender: async (pageData: { getTextContent: () => Promise<{ items: { str?: string; transform: number[] }[] }> }) => {
        const tc = await pageData.getTextContent();
        let text = "";
        let lastY: number | null = null;
        for (const it of tc.items) {
          const y = it.transform?.[5] ?? 0;
          if (lastY !== null && Math.abs(y - lastY) > 2) text += "\n";
          else if (text.length > 0 && !text.endsWith(" ")) text += " ";
          text += String(it.str ?? "");
          lastY = y;
        }
        pageTexts.push(text);
        return text;
      },
    });
    const pageCount = Number(parsed.numpages ?? pageTexts.length ?? 0) || null;
    return { pageCount, pages: pageTexts };
  } catch (e) {
    return { pageCount: null, pages: [], error: (e as Error).message };
  }
}

function detectBoundaries(pages: string[]): DetectedBoundary[] {
  const out: DetectedBoundary[] = [];
  const headingRx = /(^|\n)\s*(lecture|lect\.?|chapter)\s*([0-9ivx]+)?\s*[:\-]?\s*([^\n]{4,120})/i;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] ?? "";
    const top = page.split("\n").slice(0, 8).join("\n");
    const m = top.match(headingRx) ?? page.match(headingRx);
    if (m) {
      out.push({
        page: i + 1,
        marker: `${m[2]} ${m[3] ?? ""} ${m[4] ?? ""}`.trim(),
        score: top.match(headingRx) ? 0.9 : 0.65,
      });
    }
  }
  return out;
}

function scoreLectureOnPage(lectureTitle: string, pageText: string): number {
  const wt = words(lectureTitle);
  if (wt.length === 0) return 0;
  const n = norm(pageText);
  let hit = 0;
  for (const t of wt) if (n.includes(t)) hit++;
  return hit / wt.length;
}

function mapLectures(
  dbLectures: DbLecture[],
  pages: string[],
  boundaries: DetectedBoundary[],
): CandidateLectureMapping[] {
  const mappings: CandidateLectureMapping[] = [];
  const starts = boundaries.map((b) => b.page);
  const sorted = [...dbLectures].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  for (let i = 0; i < sorted.length; i++) {
    const l = sorted[i];
    let bestPage: number | null = null;
    let bestScore = 0;
    for (let p = 0; p < pages.length; p++) {
      const s = scoreLectureOnPage(l.title, pages[p]);
      if (s > bestScore) {
        bestScore = s;
        bestPage = p + 1;
      }
    }

    let startPage: number | null = null;
    let endPage: number | null = null;
    const evidence: string[] = [];
    let confidence: Confidence = "LOW";
    let ambiguous = true;

    if (bestPage && bestScore >= 0.6) {
      const nearestStart = starts.find((s) => s >= bestPage) ?? bestPage;
      const nextStart = starts.find((s) => s > nearestStart);
      startPage = nearestStart;
      endPage = nextStart ? nextStart - 1 : pages.length || null;
      confidence = bestScore >= 0.8 ? "HIGH" : "MEDIUM";
      ambiguous = bestScore < 0.75;
      evidence.push(`Title token match score ${bestScore.toFixed(2)} near page ${bestPage}`);
      if (startPage && endPage) evidence.push(`Boundary window ${startPage}-${endPage}`);
    } else if (bestPage && bestScore >= 0.35) {
      startPage = bestPage;
      endPage = null;
      confidence = "LOW";
      ambiguous = true;
      evidence.push(`Weak title token match score ${bestScore.toFixed(2)} on page ${bestPage}`);
    } else {
      evidence.push("No reliable title match in extractable text");
    }

    mappings.push({
      lectureId: l.id,
      lectureTitle: l.title,
      startPage,
      endPage,
      confidence,
      evidence,
      ambiguous,
      databaseLectureId: l.id,
    });
  }
  return mappings;
}

function toMarkdown(report: {
  summary: Record<string, number>;
  pdfs: PdfAudit[];
  problems: string[];
}): string {
  const lines: string[] = [];
  lines.push("# Content Mapping Audit");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- PDFs discovered: ${report.summary.pdfsDiscovered}`);
  lines.push(`- Modules discovered: ${report.summary.modulesDiscovered}`);
  lines.push(`- Lectures discovered: ${report.summary.lecturesDiscovered}`);
  lines.push(`- Multi-lecture PDFs: ${report.summary.multiLecturePdfs}`);
  lines.push(`- HIGH mappings: ${report.summary.highConfidence}`);
  lines.push(`- MEDIUM mappings: ${report.summary.mediumConfidence}`);
  lines.push(`- LOW mappings: ${report.summary.lowConfidence}`);
  lines.push(`- Ambiguous mappings: ${report.summary.ambiguousMappings}`);
  lines.push(`- Orphan PDFs: ${report.summary.orphanPdfs}`);
  lines.push(`- Lectures without PDFs: ${report.summary.lecturesWithoutPdfs}`);
  lines.push(`- Unprocessable PDFs: ${report.summary.unprocessablePdfs}`);
  lines.push("");
  lines.push("## PDFs");
  lines.push("");
  for (const pdf of report.pdfs) {
    lines.push(`### ${pdf.relativePath}`);
    lines.push(`- Size: ${pdf.sizeBytes} bytes`);
    lines.push(`- Pages: ${pdf.pageCount ?? "unknown"}`);
    lines.push(`- Inferred module: ${pdf.inferredModule ?? "unknown"}`);
    lines.push(`- Multi-lecture: ${pdf.appearsMultiLecture ? "yes" : "no"}`);
    if (pdf.problems.length) lines.push(`- Problems: ${pdf.problems.join("; ")}`);
    if (pdf.lectureMappings.length) {
      lines.push("- Candidate mappings:");
      for (const m of pdf.lectureMappings) {
        lines.push(
          `  - ${m.lectureTitle} (${m.databaseLectureId ?? "no-id"}): ${m.startPage ?? "?"}-${m.endPage ?? "?"}, ${m.confidence}, ambiguous=${m.ambiguous ? "YES" : "NO"}`,
        );
      }
    }
    lines.push("");
  }
  if (report.problems.length) {
    lines.push("## Global Problems");
    lines.push("");
    for (const p of report.problems) lines.push(`- ${p}`);
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const beforeCounts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM university) AS university_count,
      (SELECT COUNT(*)::int FROM faculty) AS faculty_count,
      (SELECT COUNT(*)::int FROM academic_year) AS year_count,
      (SELECT COUNT(*)::int FROM semester) AS semester_count,
      (SELECT COUNT(*)::int FROM module) AS module_count,
      (SELECT COUNT(*)::int FROM lecture) AS lecture_count
  `);

  const modules = await db.select().from(curriculumModule).orderBy(asc(curriculumModule.slug));
  const allLectures = await db
    .select({
      id: lecture.id,
      title: lecture.title,
      slug: lecture.slug,
      moduleId: lecture.moduleId,
      moduleSlug: curriculumModule.slug,
      moduleName: curriculumModule.name,
      pdfFile: lecture.pdfFile,
      pdfPageStart: lecture.pdfPageStart,
      pdfPageEnd: lecture.pdfPageEnd,
      order: lecture.order,
    })
    .from(lecture)
    .innerJoin(curriculumModule, eq(lecture.moduleId, curriculumModule.id))
    .orderBy(asc(curriculumModule.slug), asc(lecture.order), asc(lecture.title));

  await db.select().from(university);
  await db.select().from(faculty);
  await db.select().from(program);
  await db.select().from(academicYear);
  await db.select().from(semester);
  await db.select().from(subject);

  const pdfs = listPdfs(CONTENT_ROOT);
  const byPdfFromDb = new Map<string, DbLecture[]>();
  for (const l of allLectures) {
    if (!l.pdfFile) continue;
    const arr = byPdfFromDb.get(norm(l.pdfFile)) ?? [];
    arr.push(l);
    byPdfFromDb.set(norm(l.pdfFile), arr);
  }

  const audited: PdfAudit[] = [];
  const globalProblems: string[] = [];
  let high = 0;
  let med = 0;
  let low = 0;
  let ambiguousCount = 0;
  let multiLecture = 0;
  let orphanPdfs = 0;
  let unprocessable = 0;

  for (const abs of pdfs) {
    const rel = relative(CONTENT_ROOT, abs).replace(/\\/g, "/");
    const st = statSync(abs);
    const fromDb = byPdfFromDb.get(norm(rel)) ?? [];
    const moduleCandidates = [...new Set(fromDb.map((l) => l.moduleSlug))];
    const inferredModule = moduleCandidates.length === 1 ? moduleCandidates[0] : null;

    const parse = await readPdfPages(abs);
    const textExtractable = parse.pages.some((p) => norm(p).length > 40);
    const scannedOrImageOnly = parse.pageCount !== null && !textExtractable;
    if (!textExtractable) unprocessable++;

    const boundaries = textExtractable ? detectBoundaries(parse.pages) : [];
    const appearsMultiLecture = boundaries.length > 1 || fromDb.length > 1;
    if (appearsMultiLecture) multiLecture++;

    const mappings = fromDb.length
      ? mapLectures(fromDb, parse.pages, boundaries)
      : [];
    for (const m of mappings) {
      if (m.confidence === "HIGH") high++;
      else if (m.confidence === "MEDIUM") med++;
      else low++;
      if (m.ambiguous) ambiguousCount++;
    }

    const problems: string[] = [];
    if (fromDb.length === 0) {
      problems.push("PDF has no matching lecture record");
      orphanPdfs++;
    }
    if (!inferredModule) problems.push("PDF module is ambiguous or unknown");
    if (scannedOrImageOnly) problems.push("PDF text could not be extracted (likely scanned/image-only)");
    if (parse.pageCount === null) problems.push("Missing page count");
    if (appearsMultiLecture) problems.push("Contains or appears to contain multiple lectures");

    audited.push({
      absolutePath: abs,
      relativePath: rel,
      filename: basename(abs),
      sizeBytes: st.size,
      pageCount: parse.pageCount,
      textExtractable,
      scannedOrImageOnly,
      moduleCandidates,
      inferredModule,
      appearsMultiLecture,
      boundaries,
      lectureMappings: mappings,
      problems,
    });
  }

  const lecturesWithoutPdf = allLectures.filter((l) => !l.pdfFile).length;
  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });

  const summary = {
    pdfsDiscovered: audited.length,
    modulesDiscovered: modules.length,
    lecturesDiscovered: allLectures.length,
    multiLecturePdfs: multiLecture,
    highConfidence: high,
    mediumConfidence: med,
    lowConfidence: low,
    ambiguousMappings: ambiguousCount,
    orphanPdfs,
    lecturesWithoutPdfs: lecturesWithoutPdf,
    unprocessablePdfs: unprocessable,
  };

  const afterCounts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM university) AS university_count,
      (SELECT COUNT(*)::int FROM faculty) AS faculty_count,
      (SELECT COUNT(*)::int FROM academic_year) AS year_count,
      (SELECT COUNT(*)::int FROM semester) AS semester_count,
      (SELECT COUNT(*)::int FROM module) AS module_count,
      (SELECT COUNT(*)::int FROM lecture) AS lecture_count
  `);

  const report = {
    generatedAt: new Date().toISOString(),
    contentRoot: CONTENT_ROOT,
    readOnly: true,
    dbRowCountsBefore: beforeCounts[0],
    dbRowCountsAfter: afterCounts[0],
    dbCountsUnchanged: JSON.stringify(beforeCounts[0]) === JSON.stringify(afterCounts[0]),
    summary,
    pdfs: audited,
    problems: globalProblems,
  };

  writeFileSync(JSON_REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(MD_REPORT_PATH, toMarkdown(report), "utf8");
  console.log(JSON.stringify({ json: JSON_REPORT_PATH, md: MD_REPORT_PATH, summary }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

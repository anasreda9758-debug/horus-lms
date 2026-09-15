export type SourceReference = {
  startLine: number;
  endLine: number;
};

export type SummaryConcept = {
  title: string;
  points: string[];
  source?: SourceReference[];
};

export type SummarySection = {
  title: string;
  points: string[];
  concepts?: SummaryConcept[];
  source?: SourceReference[];
};

export type SummaryQualityStatus = "REJECTED" | "NEEDS_REVIEW" | "PASS";

export type SummaryQuality = {
  status: SummaryQualityStatus;
  incompleteFragments: number;
  duplicates: number;
  emptyHeadings: number;
  unsupportedFacts: number;
  majorConceptsDetected: number;
  majorConceptsRepresented: number;
  maximumHierarchyDepth: number;
  reasons: string[];
};

export type StructuredSummary = {
  version: 3;
  reviewStatus: "GENERATED" | "NEEDS_REVIEW" | "APPROVED";
  overview: string;
  sections: SummarySection[];
  highYieldPoints: string[];
  mustRemember: string[];
  keyPoints: string[];
  clinicalPearls: string[];
  references: string[];
  quality: SummaryQuality;
};

export type StudyMindmapNode = {
  label: string;
  children?: StudyMindmapNode[];
  source?: SourceReference[];
};

const JUNK = [
  /^(?:page|slide)\s*[-:]?\s*\d+$/i,
  /^(?:horus university|faculty of medicine|staff members|all rights reserved)$/i,
  /^(?:prof\.?|dr\.?|lecture\s+\d+)\b/i,
  /^https?:\/\//i,
];
const BULLET = /^(?:[•▪➢◦●❖✓✔*-]|\d+[.)]|[a-z][.)])\s*/i;
const LABELS = /^(definition|position|direction|size|classification|types?|causes?|etiology|pathogenesis|pathology|structure|molecular structure|functions?|function|clinical features|complications?|diagnosis|treatment|management|mechanism|incidence|mode of infection|route|course|fate|lm|em|n\/e|m\/e|important|features?)\s*:/i;

function cleanLine(line: string) {
  return line
    .replace(/\u0000/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/[ \t]+([,:;.)])/g, "$1")
    .trim();
}

function keyOf(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .trim();
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = keyOf(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isJunk(line: string) {
  return JUNK.some((pattern) => pattern.test(line)) || /^\d{1,3}$/.test(line);
}

function isFragment(line: string) {
  const value = line.replace(/[.:]+$/, "").trim();
  return (
    value.length < 24 ||
    /[:;,]$/.test(line) ||
    /^(?:and|or|of|to|from|with|by|in|on|for)\b/i.test(value) ||
    /(?:and|or|of|to|from|with|by|in|on|for)$/i.test(value) ||
    /\b(\w+)\s+\1\b/i.test(value)
  );
}

function isHeading(line: string, nextLine?: string) {
  if (isJunk(line) || line.length < 3 || line.length > 110) return false;
  if (LABELS.test(line)) return true;
  if (/^[A-Z][^.!?]*:$/.test(line)) return true;
  if (/[.!?,;:]$/.test(line)) return false;
  if (/^\d+[.)]\s+\S/.test(line)) return false;
  if (/^[A-Z][A-Z\s&/-]{3,}$/.test(line)) return true;
  if (/^(?:lecture|chapter|section|unit|classification|types?|causes?|pathogenesis|pathology|structure|functions?|complications?|diagnosis|treatment|management|mechanism|cell membrane|cell organelles)\b/i.test(line)) return true;
  return Boolean(
    nextLine &&
      (BULLET.test(nextLine) || LABELS.test(nextLine) || /^[A-Z][^.!?]*:$/.test(nextLine)),
  );
}

function sectionForHeading(heading: string) {
  const value = heading.toLowerCase();
  if (/classification|types?|structure|molecular|features?|anatomy|histology|organelles|membrane/.test(value)) return "Core concepts";
  if (/function|mechanism|pathogenesis|course|fate|transport|process/.test(value)) return "Functions and mechanisms";
  if (/cause|etiology|incidence|risk|mode|route/.test(value)) return "Causes and classification";
  if (/clinical|diagnos|complication|treatment|management|pathology|lm|em|n\/e|m\/e/.test(value)) return "Clinical and distinguishing features";
  return "Core concepts";
}

function titleForConcept(line: string) {
  return line.replace(/:$/, "").replace(BULLET, "").trim();
}

export function normalizeSource(source: string) {
  const lines = source.split(/\r?\n/).map(cleanLine);
  const normalized: { text: string; line: number }[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || isJunk(line)) continue;
    const previous = normalized.at(-1);
    if (
      previous &&
      !isHeading(line, lines[index + 1]) &&
      !BULLET.test(line) &&
      !LABELS.test(line) &&
      /^[a-z(]/.test(line) &&
      !/[.!?]$/.test(previous.text) &&
      !/[.:]$/.test(previous.text)
    ) {
      previous.text = `${previous.text} ${line}`;
    } else {
      normalized.push({ text: line, line: index + 1 });
    }
  }
  return normalized;
}

function mergeReference(target: SourceReference[] | undefined, startLine: number, endLine: number) {
  const references = target ?? [];
  const last = references.at(-1);
  if (last && startLine <= last.endLine + 1) last.endLine = Math.max(last.endLine, endLine);
  else references.push({ startLine, endLine });
  return references;
}

function buildConcepts(title: string, source: string) {
  const lines = normalizeSource(source);
  const sections = new Map<string, SummarySection>();
  let currentSection = "Core concepts";
  let currentConcept: SummaryConcept | null = null;
  let pendingPrefix = "";

  const addConcept = (conceptTitle: string, line: number): SummaryConcept => {
    const section = sections.get(currentSection) ?? { title: currentSection, points: [], concepts: [] };
    const existing = section.concepts?.find((concept) => keyOf(concept.title) === keyOf(conceptTitle));
    const concept = existing ?? { title: conceptTitle, points: [], source: [] };
    currentConcept = concept;
    if (!existing) section.concepts?.push(concept);
    section.source = mergeReference(section.source, line, line);
    sections.set(currentSection, section);
    return concept;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const { text, line } = lines[index];
    const detectedLabel = text.match(LABELS);
    const bulletText = text.replace(BULLET, "").trim();
    const startsBullet = bulletText !== text;

    if (isHeading(text, lines[index + 1]?.text) && !detectedLabel) {
      currentSection = sectionForHeading(text);
      addConcept(titleForConcept(text), line);
      pendingPrefix = "";
      continue;
    }

    if (detectedLabel) {
      const label = detectedLabel[1];
      const remainder = text.slice(detectedLabel[0].length).trim();
      currentSection = sectionForHeading(label);
      if (remainder && !isFragment(remainder)) {
        const concept = addConcept(label, line);
        concept.points.push(remainder.replace(/[.;]+$/, "") + ".");
        concept.source = mergeReference(concept.source, line, line);
      } else {
        addConcept(label, line);
        pendingPrefix = remainder.replace(/[:.;]+$/, "").trim();
      }
      continue;
    }

    if (startsBullet && isFragment(bulletText)) {
      const next = lines[index + 1]?.text.replace(BULLET, "").trim();
      if (next && !isFragment(next)) {
        lines[index + 1].text = `${bulletText} ${next}`;
        continue;
      }
    }

    if (!currentConcept) currentConcept = addConcept(title, line);
    if (!startsBullet) pendingPrefix = "";
    if (!isFragment(bulletText)) {
      const point = `${pendingPrefix ? `${pendingPrefix} ` : ""}${bulletText.replace(/[.;]+$/, "")}.`;
      currentConcept.points.push(point);
      currentConcept.source = mergeReference(currentConcept.source, line, line);
    }
  }

  const usedPoints = new Set<string>();
  return [...sections.values()]
    .map((section) => {
      const concepts = (section.concepts ?? [])
        .map((concept) => ({
          ...concept,
          points: unique(concept.points).filter((point) => {
            const key = keyOf(point);
            if (usedPoints.has(key)) return false;
            usedPoints.add(key);
            return true;
          }),
        }))
        .filter((concept) => concept.points.length > 0);
      return {
        ...section,
        concepts,
        points: concepts.flatMap((concept) => concept.points),
      };
    })
    .filter((section) => section.concepts?.length);
}

function flattenConcepts(sections: SummarySection[]) {
  return sections.flatMap((section) => section.concepts ?? []);
}

function calculateDepth(node: StudyMindmapNode): number {
  return 1 + Math.max(0, ...(node.children ?? []).map(calculateDepth));
}

export function buildStructuredSummary(title: string, source: string): StructuredSummary {
  const sections = buildConcepts(title, source);
  const concepts = flattenConcepts(sections);
  const allPoints = sections.flatMap((section) => section.points);
  const highYieldPoints = unique(
    concepts
      .filter((concept) => /definition|classification|function|mechanism|cause|complication|structure|diagnos|treatment/i.test(concept.title))
      .flatMap((concept) => concept.points),
  ).slice(0, 8);
  const mustRemember = unique(
    sections.flatMap((section) => section.points.slice(0, 2)),
  ).slice(0, 8);
  const focus = sections.map((section) => section.title.toLowerCase()).join(", ");
  const overview = sections.length
    ? `${title} is organized around ${focus}. The points below retain the source's definitions, classifications, structures, functions, and distinguishing features without adding information not present in the lecture.`
    : `${title} does not contain enough clean source material for an approved revision summary.`;
  const provisional: StructuredSummary = {
    version: 3,
    reviewStatus: "NEEDS_REVIEW",
    overview,
    sections,
    highYieldPoints,
    mustRemember,
    keyPoints: allPoints.slice(0, 8),
    clinicalPearls: [],
    references: [],
    quality: {
      status: "NEEDS_REVIEW",
      incompleteFragments: 0,
      duplicates: 0,
      emptyHeadings: 0,
      unsupportedFacts: 0,
      majorConceptsDetected: concepts.length,
      majorConceptsRepresented: concepts.filter((concept) => concept.points.length > 0).length,
      maximumHierarchyDepth: 0,
      reasons: [],
    },
  };
  const quality = countSummaryQuality(provisional);
  provisional.quality = quality;
  return provisional;
}

export function buildStructuredMindmap(title: string, summary: StructuredSummary): StudyMindmapNode {
  const branches = summary.sections.length > 1
    ? summary.sections.map((section) => ({
        label: section.title,
        source: section.source,
        children: (section.concepts ?? []).map((concept) => ({
          label: concept.title,
          source: concept.source,
          children: concept.points.map((point) => ({ label: point, source: concept.source })),
        })),
      }))
    : flattenConcepts(summary.sections).map((concept) => ({
        label: concept.title,
        source: concept.source,
        children: concept.points.map((point) => ({ label: point, source: concept.source })),
      }));
  return {
    label: title,
    children: branches,
  };
}

export function countSummaryQuality(summary: StructuredSummary): SummaryQuality {
  const points = summary.sections.flatMap((section) => section.points);
  const duplicates = points.length - unique(points).length;
  const incompleteFragments = points.filter(isFragment).length;
  const emptyHeadings = summary.sections.filter((section) => section.points.length === 0).length;
  const mindmap = buildStructuredMindmap(summary.overview, summary);
  const maximumHierarchyDepth = calculateDepth(mindmap);
  const reasons: string[] = [];
  if (incompleteFragments) reasons.push("incomplete or fragmentary points remain");
  if (duplicates) reasons.push("duplicate points remain");
  if (emptyHeadings) reasons.push("empty headings remain");
  if (summary.sections.length < 2 && conceptsForQuality(summary).length < 3) {
    reasons.push("fewer than two logical concept groups were detected");
  }
  if (maximumHierarchyDepth < 3) reasons.push("mind map hierarchy is too flat");
  if (summary.overview.length < 80) reasons.push("overview is too shallow");
  const status: SummaryQualityStatus =
    reasons.some((reason) => /fragment|duplicate|empty|flat/.test(reason))
      ? "REJECTED"
      : reasons.length
        ? "NEEDS_REVIEW"
        : "PASS";
  return {
    status,
    incompleteFragments,
    duplicates,
    emptyHeadings,
    unsupportedFacts: 0,
    majorConceptsDetected: summary.sections.reduce((count, section) => count + (section.concepts?.length ?? 0), 0),
    majorConceptsRepresented: conceptsForQuality(summary).filter((concept) => concept.points.length > 0).length,
    maximumHierarchyDepth,
    reasons,
  };
}

function conceptsForQuality(summary: StructuredSummary) {
  return flattenConcepts(summary.sections);
}

export type SummarySection = {
  title: string;
  points: string[];
};

export type StructuredSummary = {
  version: 2;
  overview: string;
  sections: SummarySection[];
  highYieldPoints: string[];
  mustRemember: string[];
  keyPoints: string[];
  clinicalPearls: string[];
  references: string[];
};

export type StudyMindmapNode = {
  label: string;
  children?: StudyMindmapNode[];
};

const BOILERPLATE = /^(by|anatomy staff members|horus university|external features of the heart|the heart)$/i;
const BULLET = /^(?:[•▪➢◦●]|o|\-)\s*/;

function cleanLine(line: string) {
  return line
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function headingForLine(line: string) {
  const match = line.match(
    /^(Position|Direction|Size|Apex of the heart|Base of the heart|Borders of the heart|Upper border|Lower border|Right border|Left border|Surfaces of the heart|Grooves of the heart|Coronary \(atrio ?-? ?ventricular\) groove|Interatrial groove|Anterior interventricular groove|Posterior interventricular groove|The heart is conical in shape having):?/i,
  );
  if (match) return match[1];
  if (/^\d+\.\s+(?:Left|Right|Diaphragmatic|Sternocostal)/i.test(line)) return line.replace(/:$/, "");
  return null;
}

function topicForHeading(heading: string) {
  if (/position|direction|size/i.test(heading)) return "Position and orientation";
  if (/apex|base|border/i.test(heading)) return "External landmarks";
  if (/surface/i.test(heading)) return "Surfaces";
  if (/groove/i.test(heading)) return "Grooves";
  return "Core concepts";
}

function withContext(heading: string, value: string) {
  const text = value.replace(/[.:]+$/, "").trim();
  if (!text) return null;
  const lowerFirst = (value: string) => value ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
  if (/^position$/i.test(heading)) return `The heart lies ${lowerFirst(text.replace(/^the heart lies\s*/i, ""))}.`;
  if (/^direction$/i.test(heading)) return `The long axis of the heart is directed ${lowerFirst(text.replace(/^its long axis is directed\s*/i, ""))}.`;
  if (/^size$/i.test(heading)) return `The heart is approximately the size of ${lowerFirst(text.replace(/^equals the size of\s*/i, ""))}.`;
  if (/^the heart is conical/i.test(heading)) {
    const detail = lowerFirst(text)
      .replace(/^apex$/, "an apex")
      .replace(/^base\b/, "a base")
      .replace(/\bChambers\b/g, "chambers")
      .replace(/\bBorders\b/g, "borders")
      .replace(/\bSurfaces\b/g, "surfaces")
      .replace(/\bGrooves\b/g, "grooves");
    return `The heart is conical in shape and has ${detail}.`;
  }
  return `${heading.replace(/:$/, "")}: ${lowerFirst(text)}.`;
}

function isUsablePoint(point: string) {
  const normalized = point.toLowerCase().replace(/[.]+$/, "").trim();
  return (
    normalized.length >= 25 &&
    !/(?:into|from|with|by|of|and|or|to)$/.test(normalized) &&
    !/\b(\w+)\s+\1\b/.test(normalized) &&
    !/\bf the heart\b/.test(normalized) &&
    !/interventricular$/.test(normalized)
  );
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildStructuredSummary(title: string, source: string): StructuredSummary {
  const sections = new Map<string, string[]>();
  let heading = "Core concepts";
  let pending = "";

  for (const rawLine of source.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (!line || BOILERPLATE.test(line) || /^\d+$/.test(line)) continue;

    const bullet = line.replace(BULLET, "");
    const startsBullet = bullet !== line;
    const detectedHeading = headingForLine(line);
    if (detectedHeading) {
      heading = detectedHeading;
      const rawRemainder = line.slice(detectedHeading.length).replace(/^:/, "").trim();
      const remainderPoint = rawRemainder && !rawRemainder.endsWith(":")
        ? withContext(heading, rawRemainder)
        : null;
      if (remainderPoint && isUsablePoint(remainderPoint)) {
        const topic = topicForHeading(heading);
        sections.set(topic, [...(sections.get(topic) ?? []), remainderPoint]);
      }
      const remainder = rawRemainder;
      pending = remainder.endsWith(":") ? remainder.replace(/:$/, "").trim() : "";
      continue;
    }

    if (startsBullet || pending) {
      const value = pending ? `${pending} ${bullet}` : bullet;
      pending = "";
      const point = withContext(heading, value);
      if (point && isUsablePoint(point)) {
        const topic = topicForHeading(heading);
        sections.set(topic, [...(sections.get(topic) ?? []), point]);
      }
      continue;
    }

    if (sections.size > 0 && /^[a-z(]/.test(bullet)) {
      const topic = topicForHeading(heading);
      const previous = sections.get(topic);
      if (previous?.length && /\b(?:the|from|of|and|to|by)$/.test(previous[previous.length - 1].replace(/\.$/, ""))) {
        previous[previous.length - 1] = `${previous[previous.length - 1].replace(/\.$/, "")} ${bullet.replace(/[.:]+$/, "")}.`;
      }
    }
  }

  const normalizedSections = [...sections.entries()]
    .map(([sectionTitle, points]) => ({ title: sectionTitle, points: unique(points) }))
    .filter((section) => section.points.length > 0);
  const allPoints = normalizedSections.flatMap((section) => section.points);
  const labels = normalizedSections.map((section) => section.title.toLowerCase());
  const focus = labels.length > 1
    ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`
    : labels[0] ?? "the main concepts";

  return {
    version: 2,
    overview: `This lecture explains ${title.toLowerCase()} through ${focus}, using the relationships and distinguishing features stated in the source.`,
    sections: normalizedSections,
    highYieldPoints: allPoints.slice(0, 8),
    mustRemember: normalizedSections.map((section) => section.points[0]).filter(Boolean).slice(0, 5),
    keyPoints: allPoints.slice(0, 8),
    clinicalPearls: [],
    references: [],
  };
}

export function buildStructuredMindmap(title: string, summary: StructuredSummary): StudyMindmapNode {
  return {
    label: title,
    children: summary.sections.map((section) => ({
      label: section.title,
      children: section.points.map((point) => ({ label: point })),
    })),
  };
}

export function countSummaryQuality(summary: StructuredSummary) {
  const points = summary.sections.flatMap((section) => section.points);
  return {
    incompleteFragments: points.filter((point) => /:\s*$/.test(point) || point.length < 20).length,
    duplicates: points.length - unique(points).length,
    emptyHeadings: summary.sections.filter((section) => section.points.length === 0).length,
  };
}

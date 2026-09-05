type Summary = {
  overview?: string;
  keyPoints?: string[];
  clinicalPearls?: string[];
} | null;

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sourceSentences(content: string) {
  return content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(clean)
    .filter((line) => line.length >= 35 && line.length <= 360)
    .slice(0, 12);
}

function studyPoints(content: string, summary: Summary) {
  const points = [...(summary?.keyPoints ?? []), ...(summary?.clinicalPearls ?? [])]
    .map(clean)
    .filter((point) => point.length >= 8);
  return [...new Set(points)].slice(0, 12).length >= 3
    ? [...new Set(points)].slice(0, 12)
    : sourceSentences(content);
}

function tidyPoint(value: string) {
  return clean(value)
    .replace(/^[◆■▌•▪◦\-–—]+\s*/, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\.{3,}/g, "…");
}

function questionForPoint(title: string, point: string) {
  const cleaned = tidyPoint(point);
  const term = cleaned.match(
    /^(.{3,72}?)(?:\s+(?:is|are|means|refers to|includes|consists of|causes|prevents|increases|decreases)\b|\s*[:–—-]\s*)/i,
  )?.[1]?.trim();

  if (term && !/^the\s+(response|drug|patient|lecture)/i.test(term)) {
    return `ما الذي يميّز «${term}»؟`;
  }
  return `ما النقطة الأساسية في «${title}»؟`;
}

/** Free, local fallback used when a hosted AI model is not configured. */
export function createSourceFlashcards(title: string, content: string, summary: Summary) {
  const points = [...new Set(studyPoints(content, summary).map(tidyPoint))]
    .filter((point) => point.length >= 12 && point.length <= 360)
    .slice(0, 12);
  return points.map((point) => ({
    front: questionForPoint(title, point),
    back: point,
  }));
}

/** A source-grounded study case, without adding unsupported medical facts. */
export function createSourceClinicalCase(title: string, content: string, summary: Summary) {
  const points = studyPoints(content, summary);
  const selected = points.slice(0, 3);
  const overview = clean(summary?.overview ?? selected[0] ?? `Review the source material for ${title}.`);
  return {
    case: `Study scenario: a student is revising “${title}”. Use the lecture source to explain the key concepts accurately.\n\n${overview}`,
    questions: selected.map((_, index) => `What is key point ${index + 1} in this lecture?`),
    model_answers: selected,
  };
}

/**
 * Local, source-bound tutor reply used when no hosted model is configured.
 * It deliberately reorganizes existing notes instead of inventing medical facts.
 */
export function createSourceTutorReply(
  title: string,
  content: string,
  summary: Summary,
  question: string,
) {
  const points = [...new Set(studyPoints(content, summary).map(tidyPoint))]
    .filter((point) => point.length >= 12)
    .slice(0, 8);
  const overview = tidyPoint(summary?.overview ?? "");
  const lower = question.toLowerCase();
  const keywords = (lower.match(/[\p{L}\p{N}]{3,}/gu) ?? [])
    .filter((word) => !["المحاضرة", "الشرح", "اشرح", "what", "with", "this"].includes(word));
  const ranked = points
    .map((point) => ({
      point,
      score: keywords.reduce((score, word) => score + (point.toLowerCase().includes(word) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score || points.indexOf(a.point) - points.indexOf(b.point));
  const relevant = ranked.filter((item) => item.score > 0).map((item) => item.point).slice(0, 4);
  const selected = (relevant.length ? relevant : points).slice(0, 4);

  if (/ملخص|summary/.test(lower)) {
    return [overview || `ملخص «${title}».`, ...selected.map((point) => `• ${point}`)].join("\n");
  }
  if (/اختبار|امتحان|mcq|سؤال|اختبر/.test(lower)) {
    const answer = selected[0] ?? overview;
    return answer
      ? `سؤال مراجعة: ما العبارة الصحيحة عن «${title}»؟\n\nالإجابة من محتوى المحاضرة: ${answer}`
      : `لا توجد نقاط نصية كافية لإنشاء سؤال لهذه المحاضرة.`;
  }
  if (/مصطلح|terms?|تعريف|define/.test(lower)) {
    return selected.length
      ? selected.map((point) => `• ${point}`).join("\n")
      : `لا توجد مصطلحات نصية كافية في «${title}».`;
  }

  return [overview || `في «${title}» ركّز على النقاط التالية:`, ...selected.map((point) => `• ${point}`)].join("\n");
}

export function evaluateSourceAnswers(answers: string[], modelAnswers: string[]) {
  const answerWords = answers.join(" ").toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  const expectedWords = modelAnswers.join(" ").toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  const expected = new Set(expectedWords);
  const matched = new Set(answerWords.filter((word) => expected.has(word))).size;
  const score = expected.size ? Math.round((matched / expected.size) * 100) : 0;
  return {
    score: Math.min(100, score),
    feedback: score >= 70
      ? "إجابتك تغطي معظم النقاط الموجودة في المصدر. راجع التفاصيل للتثبيت."
      : "راجع الإجابة النموذجية وقارنها بمحتوى المحاضرة، ثم أعد المحاولة مع ذكر المصطلحات الأساسية.",
  };
}

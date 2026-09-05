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

/** Free, local fallback used when a hosted AI model is not configured. */
export function createSourceFlashcards(title: string, content: string, summary: Summary) {
  const points = studyPoints(content, summary);
  return points.slice(0, 12).map((point, index) => ({
    front: `${title} — key point ${index + 1}`,
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

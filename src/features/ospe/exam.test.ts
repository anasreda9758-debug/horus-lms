import { describe, it, expect } from "vitest";

/**
 * OSPE keyword scoring logic — extracted for testability.
 * This mirrors the scoring in src/features/ospe/exam.ts
 */

type RubricItem = {
  criterion: string;
  maxPoints: number;
};

function scoreAnswer(answer: string, rubrics: RubricItem[]): { score: number; maxScore: number } {
  let score = 0;
  let maxScore = 0;
  const answerLower = answer.toLowerCase();

  for (const r of rubrics) {
    maxScore += r.maxPoints;
    const criterionWords = r.criterion.toLowerCase().split(/\s+/);
    const matchCount = criterionWords.filter((w) => w.length > 2 && answerLower.includes(w)).length;
    if (matchCount >= Math.ceil(criterionWords.length * 0.4)) {
      score += r.maxPoints;
    }
  }

  return { score, maxScore };
}

describe("OSPE Keyword Scoring", () => {
  const rubrics: RubricItem[] = [
    { criterion: "Correct identification of heart valve", maxPoints: 2 },
    { criterion: "Mention of stenosis or regurgitation", maxPoints: 3 },
    { criterion: "Appropriate differential diagnosis", maxPoints: 2 },
  ];

  it("full score when all keywords match", () => {
    const answer = "This is a heart valve showing stenosis and regurgitation with appropriate differential diagnosis";
    const { score, maxScore } = scoreAnswer(answer, rubrics);
    expect(score).toBe(7);
    expect(maxScore).toBe(7);
  });

  it("partial score when some keywords match", () => {
    const answer = "Heart valve pathology with stenosis";
    const { score, maxScore } = scoreAnswer(answer, rubrics);
    expect(maxScore).toBe(7);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(7);
  });

  it("zero score for irrelevant answer", () => {
    const answer = "The sky is blue today";
    const { score } = scoreAnswer(answer, rubrics);
    expect(score).toBe(0);
  });

  it("handles Arabic answers", () => {
    const arabicRubrics: RubricItem[] = [
      { criterion: "القلب تصلب صمام", maxPoints: 3 },
      { criterion: "ارتجاع تشخيص", maxPoints: 2 },
    ];
    const answer = "القلب يظهر تصلب في الصمام وارتجاع";
    const { score, maxScore } = scoreAnswer(answer, arabicRubrics);
    expect(score).toBe(5);
    expect(maxScore).toBe(5);
  });

  it("handles empty answer", () => {
    const { score } = scoreAnswer("", rubrics);
    expect(score).toBe(0);
  });

  it("handles empty rubrics", () => {
    const { score, maxScore } = scoreAnswer("any answer", []);
    expect(score).toBe(0);
    expect(maxScore).toBe(0);
  });

  it("single-word criterion matches easily", () => {
    const simpleRubrics: RubricItem[] = [
      { criterion: "cardiac", maxPoints: 1 },
    ];
    const { score } = scoreAnswer("The cardiac system is involved", simpleRubrics);
    expect(score).toBe(1);
  });

  it("short words (<3 chars) are skipped in matching", () => {
    const rubrics: RubricItem[] = [
      { criterion: "is a correct diagnosis of pneumonia", maxPoints: 2 },
    ];
    // "is" and "a" are too short, but "correct", "diagnosis", "of", "pneumonia" should work
    // "of" is 2 chars → skipped. "is" → skipped. "a" → skipped.
    // "correct" + "diagnosis" + "pneumonia" = 3/5 → 60% → ≥ 40% threshold
    const { score } = scoreAnswer("This is a correct diagnosis of pneumonia", rubrics);
    expect(score).toBe(2);
  });
});

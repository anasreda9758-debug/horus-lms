import { z } from "zod";

export const PILOT_MODULE = "rau-203";
export const PILOT_SUBJECT = "Anatomy";
export const statusSchema = z.enum(["DRAFT_AI", "REVIEWED", "APPROVED"]);
const english = z.string().min(1).max(4000).refine((s) => !/[\u0600-\u06ff]/u.test(s), "Learning content must be English");
export const sourceSchema = z.object({
  title: english,
  path: z.string().min(1),
  sha256: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
});
export const markerSchema = z.object({
  id: z.string().min(1), x: z.number().min(0).max(1), y: z.number().min(0).max(1),
  label: z.string().max(12).optional(),
});
export const imageSchema = z.object({
  id: z.string(), moduleId: z.string(), subject: z.string(), studyYear: z.number().int().positive(),
  storageKey: z.string(), alt: english, sourceMaterial: sourceSchema,
  sourcePage: z.number().int().positive(), markers: z.array(markerSchema),
  status: statusSchema, isFixture: z.boolean(),
});
export const questionSchema = z.object({
  id: z.string(), academicYearId: z.string().nullable(), studyYear: z.number().int().positive(),
  moduleId: z.string(), subject: z.string(), sourceLectureId: z.string().nullable(),
  sourceMaterial: sourceSchema, sourcePage: z.number().int().positive(),
  questionType: z.enum(["LABELED_STRUCTURE", "IMAGE_IDENTIFICATION", "STRUCTURE_RELATION"]),
  answerFormat: z.literal("SINGLE_CHOICE"), imageId: z.string(), markerIds: z.array(z.string()),
  groupId: z.string(), order: z.number().int().nonnegative(), prompt: english,
  options: z.array(z.object({ id: z.string().min(1), text: english })).min(2).max(6),
  correctOptionId: z.string(), explanation: english, identifyingClue: english,
  commonMistake: english, examTip: english, status: statusSchema, isFixture: z.boolean(),
}).superRefine((q, ctx) => {
  const ids = q.options.map((o) => o.id);
  if (new Set(ids).size !== ids.length || !ids.includes(q.correctOptionId)) {
    ctx.addIssue({ code: "custom", message: "Exactly one valid correctOptionId is required" });
  }
});
export type PracticalImage = z.infer<typeof imageSchema>;
export type PracticalQuestion = z.infer<typeof questionSchema>;
export type SourceMaterial = z.infer<typeof sourceSchema>;
export type Marker = z.infer<typeof markerSchema>;
export type Scope = { moduleId: string; subject: string; studyYear: number; fixtures: boolean };
export type Progress = { questionId: string; attempts: number; correct: number; wrong: number; wrongRemaining: boolean; bookmarked: boolean; difficult: boolean };
export type Feedback = Pick<PracticalQuestion, "correctOptionId" | "explanation" | "identifyingClue" | "commonMistake" | "examTip" | "sourceMaterial" | "sourcePage"> & { correct: boolean; correctAnswer: string };

function approvedSource(source: SourceMaterial) {
  return /^[a-f0-9]{64}$/i.test(source.sha256) && Boolean(source.approvedBy && source.approvedAt);
}

/** Fail closed: a folder name or an image alone never makes a question eligible. */
export function eligibleQuestion(q: PracticalQuestion, image: PracticalImage | undefined, scope: Scope) {
  if (!image || q.moduleId !== scope.moduleId || q.subject !== scope.subject || q.studyYear !== scope.studyYear) return false;
  if (image.id !== q.imageId || image.moduleId !== q.moduleId || image.subject !== q.subject || image.studyYear !== q.studyYear) return false;
  if (q.isFixture !== scope.fixtures || image.isFixture !== scope.fixtures) return false;
  if (!scope.fixtures && (q.status !== "APPROVED" || image.status !== "APPROVED" || !approvedSource(q.sourceMaterial) || !approvedSource(image.sourceMaterial))) return false;
  if (q.questionType === "LABELED_STRUCTURE" && q.markerIds.length === 0) return false;
  return q.markerIds.every((id) => image.markers.some((m) => m.id === id));
}

/** Explicit allowlist: no answer key, explanation, or identifying clue before submit. */
export function studentQuestion(q: PracticalQuestion) {
  return {
    id: q.id, imageId: q.imageId, groupId: q.groupId, order: q.order,
    prompt: q.prompt, options: q.options.map(({ id, text }) => ({ id, text })),
    markerIds: q.markerIds, questionType: q.questionType, answerFormat: q.answerFormat,
  };
}
export type StudentQuestion = ReturnType<typeof studentQuestion>;
export type StudentImage = Pick<PracticalImage, "id" | "alt" | "markers"> & { url: string };
export function gradeChoice(q: PracticalQuestion, optionId: string): Feedback {
  if (!q.options.some((o) => o.id === optionId)) throw new Error("Option does not belong to this question");
  return {
    correct: optionId === q.correctOptionId, correctOptionId: q.correctOptionId,
    correctAnswer: q.options.find((o) => o.id === q.correctOptionId)!.text,
    explanation: q.explanation, identifyingClue: q.identifyingClue,
    commonMistake: q.commonMistake, examTip: q.examTip,
    sourceMaterial: q.sourceMaterial, sourcePage: q.sourcePage,
  };
}
export function summarizeProgress(rows: Progress[]) {
  const sum = (key: "attempts" | "correct" | "wrong") => rows.reduce((n, row) => n + row[key], 0);
  const attempted = sum("attempts"), correct = sum("correct"), wrong = sum("wrong");
  return { attempted, correct, wrong, accuracy: attempted ? Math.round(correct / attempted * 100) : null, wrongRemaining: rows.filter((r) => r.wrongRemaining).length };
}
export type PracticalSummary = ReturnType<typeof summarizeProgress>;
export type PracticePayload = {
  questions: StudentQuestion[]; images: StudentImage[]; progress: Progress[];
  summary: PracticalSummary; fixtures: boolean; studyYear: number;
};

export function fixturesAllowed(environment: string | undefined, requested: boolean) {
  return requested && environment === "development";
}

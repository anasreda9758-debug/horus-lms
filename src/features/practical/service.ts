import {
  eligibleQuestion, gradeChoice, imageSchema, questionSchema, studentQuestion, summarizeProgress,
  PILOT_MODULE, PILOT_SUBJECT, type Scope, type PracticalQuestion, type PracticalImage, type Progress,
} from "./model";

export class PracticalError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export type Actor = { id: string; role?: string | null };
export interface PracticalStore {
  catalog(scope: Scope): Promise<{ questions: PracticalQuestion[]; images: PracticalImage[] }>;
  progress(userId: string, questionIds: string[]): Promise<Progress[]>;
  saveAnswer(userId: string, questionId: string, optionId: string, correct: boolean, requestId: string): Promise<void>;
  setFlag(userId: string, questionId: string, flag: "bookmarked" | "difficult", value: boolean): Promise<void>;
}
type Authorize = (actor: Actor, slug: string) => Promise<{ id: string; studyYear: number } | null>;
export type RequestScope = { moduleSlug: string; subject: string; fixtures: boolean };

export function createPracticalService(store: PracticalStore, authorize: Authorize, allowFixtures: boolean) {
  async function load(actor: Actor | null, request: RequestScope) {
    if (!actor) throw new PracticalError("Sign in required", 401);
    if (request.moduleSlug !== PILOT_MODULE || request.subject !== PILOT_SUBJECT) throw new PracticalError("Pilot not available for this module/subject", 404);
    if (request.fixtures && !allowFixtures) throw new PracticalError("Development fixtures are disabled", 404);
    const module = await authorize(actor, request.moduleSlug);
    if (!module) throw new PracticalError("Module access required", 403);
    const scope: Scope = { moduleId: module.id, studyYear: module.studyYear, subject: request.subject, fixtures: request.fixtures };
    const data = await store.catalog(scope);
    const images = data.images.flatMap((i) => { const p = imageSchema.safeParse(i); return p.success ? [p.data] : []; });
    const questions = data.questions.flatMap((q) => { const p = questionSchema.safeParse(q); return p.success ? [p.data] : []; })
      .filter((q) => eligibleQuestion(q, images.find((i) => i.id === q.imageId), scope))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    return { scope, questions, images: images.filter((i) => questions.some((q) => q.imageId === i.id)) };
  }
  return {
    async list(actor: Actor | null, request: RequestScope, wrongOnly = false) {
      const data = await load(actor, request);
      const progress = await store.progress(actor!.id, data.questions.map((q) => q.id));
      const questions = wrongOnly ? data.questions.filter((q) => progress.some((p) => p.questionId === q.id && p.wrongRemaining)) : data.questions;
      const query = new URLSearchParams({ module: request.moduleSlug, subject: request.subject, fixtures: request.fixtures ? "1" : "0" });
      return {
        questions: questions.map(studentQuestion),
        images: data.images.filter((i) => questions.some((q) => q.imageId === i.id)).map((i) => ({
          id: i.id, alt: i.alt, markers: i.markers,
          url: `/api/practical/images/${encodeURIComponent(i.id)}?${query}`,
        })),
        progress, summary: summarizeProgress(progress), fixtures: request.fixtures, studyYear: data.scope.studyYear,
      };
    },
    async answer(actor: Actor | null, request: RequestScope, questionId: string, optionId: string, requestId: string) {
      const data = await load(actor, request);
      const question = data.questions.find((q) => q.id === questionId);
      if (!question) throw new PracticalError("Question not available", 404);
      if (!question.options.some((o) => o.id === optionId)) throw new PracticalError("Option does not belong to this question", 400);
      const feedback = gradeChoice(question, optionId);
      // Feedback is returned only after the transaction commits successfully.
      await store.saveAnswer(actor!.id, questionId, optionId, feedback.correct, requestId);
      const progress = await store.progress(actor!.id, data.questions.map((q) => q.id));
      return { feedback, progress, summary: summarizeProgress(progress) };
    },
    async flag(actor: Actor | null, request: RequestScope, questionId: string, flag: "bookmarked" | "difficult", value: boolean) {
      const data = await load(actor, request);
      if (!data.questions.some((q) => q.id === questionId)) throw new PracticalError("Question not available", 404);
      await store.setFlag(actor!.id, questionId, flag, value);
      return { ok: true };
    },
    async image(actor: Actor | null, request: RequestScope, imageId: string) {
      const data = await load(actor, request);
      const image = data.images.find((i) => i.id === imageId);
      if (!image) throw new PracticalError("Image not available", 404);
      return image;
    },
  };
}

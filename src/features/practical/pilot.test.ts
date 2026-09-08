import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeDevelopmentFixtures } from "./fixtures";
import { createPracticalService, PracticalError, type PracticalStore, type RequestScope } from "./service";
import { eligibleQuestion, fixturesAllowed, gradeChoice, questionSchema, studentQuestion, type PracticalImage, type PracticalQuestion, type Progress } from "./model";
import { answerBody, flagBody } from "./http";

// Stateful repository substitute. Production uses the transactional PostgreSQL store.
class MemoryStore implements PracticalStore {
  data = makeDevelopmentFixtures("renal", 1);
  questions: PracticalQuestion[] = this.data.questions;
  images: PracticalImage[] = [this.data.image];
  records = new Map<string, Progress>();
  submissions = new Map<string, string>();
  async catalog() { return { questions: this.questions, images: this.images }; }
  async progress(user: string, ids: string[]) { return ids.flatMap((id) => { const row = this.records.get(`${user}/${id}`); return row ? [{ ...row }] : []; }); }
  row(user: string, questionId: string) {
    const key = `${user}/${questionId}`;
    const row = this.records.get(key) ?? { questionId, attempts: 0, correct: 0, wrong: 0, wrongRemaining: false, bookmarked: false, difficult: false };
    this.records.set(key, row); return row;
  }
  async saveAnswer(user: string, questionId: string, optionId: string, correct: boolean, requestId: string) {
    const key = `${user}/${requestId}`, value = `${questionId}/${optionId}`;
    if (this.submissions.has(key)) {
      if (this.submissions.get(key) !== value) throw new PracticalError("Request conflict", 409);
      return;
    }
    this.submissions.set(key, value);
    const row = this.row(user, questionId); row.attempts++; row.correct += +correct; row.wrong += +!correct; row.wrongRemaining = !correct;
  }
  async setFlag(user: string, questionId: string, flag: "bookmarked" | "difficult", value: boolean) { this.row(user, questionId)[flag] = value; }
}

describe("Renal Anatomy pilot", () => {
  let store: MemoryStore;
  let service: ReturnType<typeof createPracticalService>;
  const actor = { id: "student-1" };
  const request: RequestScope = { moduleSlug: "rau-203", subject: "Anatomy", fixtures: true };
  const scope = { moduleId: "renal", subject: "Anatomy", studyYear: 1, fixtures: true };
  beforeEach(() => {
    store = new MemoryStore();
    service = createPracticalService(store, async () => ({ id: "renal", studyYear: 1 }), true);
  });
  it("ships exactly 10 clearly non-medical drafts sharing one image", async () => {
    const result = await service.list(actor, request);
    expect(result.questions).toHaveLength(10); expect(result.images).toHaveLength(1);
    expect(new Set(result.questions.map((q) => q.imageId)).size).toBe(1);
    expect(new Set(result.questions.map((q) => q.groupId)).size).toBe(1);
    expect(store.questions.every((q) => q.status === "DRAFT_AI" && q.prompt.includes("Development fixture"))).toBe(true);
  });
  it("rejects other modules at the pilot boundary", async () => {
    await expect(service.list(actor, { ...request, moduleSlug: "cvs-202" })).rejects.toMatchObject({ status: 404 });
  });
  it("rejects other subjects at the pilot boundary", async () => {
    await expect(service.list(actor, { ...request, subject: "Histology" })).rejects.toMatchObject({ status: 404 });
  });
  it.each(["moduleId", "subject", "studyYear"] as const)("filters mismatched catalog %s", async (field) => {
    store.questions = [{ ...store.questions[0], [field]: field === "studyYear" ? 2 : "other" }];
    expect((await service.list(actor, request)).questions).toEqual([]);
  });
  it("requires authentication for questions, answers, flags and images", async () => {
    await expect(service.list(null, request)).rejects.toMatchObject({ status: 401 });
    await expect(service.answer(null, request, "q", "a", "r")).rejects.toMatchObject({ status: 401 });
    await expect(service.flag(null, request, "q", "bookmarked", true)).rejects.toMatchObject({ status: 401 });
    await expect(service.image(null, request, "i")).rejects.toMatchObject({ status: 401 });
  });
  it("denies every surface without module entitlement, including preview-only actors", async () => {
    service = createPracticalService(store, async () => null, true);
    await expect(service.list(actor, request)).rejects.toMatchObject({ status: 403 });
    await expect(service.answer(actor, request, "q", "a", "r")).rejects.toMatchObject({ status: 403 });
    await expect(service.flag(actor, request, "q", "bookmarked", true)).rejects.toMatchObject({ status: 403 });
    await expect(service.image(actor, request, "i")).rejects.toMatchObject({ status: 403 });
  });
  it("requires a linked image and a real marker in that image", async () => {
    const q = store.questions[0], image = store.images[0];
    expect(eligibleQuestion(q, undefined, scope)).toBe(false);
    expect(eligibleQuestion(q, { ...image, moduleId: "other" }, scope)).toBe(false);
    expect(eligibleQuestion({ ...q, markerIds: ["missing"] }, image, scope)).toBe(false);
    store.images = [];
    expect((await service.list(actor, request)).questions).toEqual([]);
    await expect(service.image(actor, request, image.id)).rejects.toMatchObject({ status: 404 });
  });
  it("validates correctOptionId membership and unique option IDs", () => {
    const q = store.questions[0];
    expect(questionSchema.safeParse({ ...q, correctOptionId: "not-an-option" }).success).toBe(false);
    expect(questionSchema.safeParse({ ...q, options: [q.options[0], q.options[0]] }).success).toBe(false);
    expect(() => gradeChoice(q, "other-question-option")).toThrow();
  });
  it("uses exact server-side choice IDs, not text or fuzzy matches", async () => {
    const q = store.questions[0];
    await expect(service.answer(actor, request, q.id, "Circle", "r0")).rejects.toMatchObject({ status: 400 });
    const result = await service.answer(actor, request, q.id, q.correctOptionId, "r1");
    expect(result.feedback.correct).toBe(true);
    expect(result.summary).toMatchObject({ attempted: 1, correct: 1, wrong: 0, accuracy: 100 });
  });
  it("never returns the key or teaching feedback before answering", async () => {
    const result = await service.list(actor, request);
    const serialized = JSON.stringify(result);
    for (const key of ["correctOptionId", "explanation", "identifyingClue", "commonMistake", "examTip", "sourceMaterial"]) expect(serialized).not.toContain(`"${key}"`);
    expect(studentQuestion(store.questions[0])).not.toHaveProperty("status");
    const answer = await service.answer(actor, request, store.questions[0].id, "shape-hexagon", "r");
    expect(answer.feedback).toHaveProperty("identifyingClue");
    expect(answer.feedback).toHaveProperty("sourcePage", 1);
  });
  it("persists mistakes across service reloads and clears them on a correct retry", async () => {
    const q = store.questions[0];
    await service.answer(actor, request, q.id, "shape-hexagon", "first");
    const reopened = createPracticalService(store, async () => ({ id: "renal", studyYear: 1 }), true);
    expect((await reopened.list(actor, request, true)).questions.map((q) => q.id)).toEqual([q.id]);
    await reopened.answer(actor, request, q.id, q.correctOptionId, "retry");
    const result = await reopened.list(actor, request, true);
    expect(result.questions).toEqual([]);
    expect(result.summary).toEqual({ attempted: 2, correct: 1, wrong: 1, accuracy: 50, wrongRemaining: 0 });
  });
  it("isolates wrong queues, flags and statistics across users", async () => {
    const q = store.questions[0], other = { id: "student-2" };
    await service.answer(actor, request, q.id, "shape-hexagon", "shared-request-id");
    await service.flag(actor, request, q.id, "bookmarked", true);
    await service.flag(actor, request, q.id, "difficult", true);
    const result = await service.list(other, request, true);
    expect(result.questions).toEqual([]); expect(result.progress).toEqual([]);
    expect(result.summary.attempted).toBe(0);
    await service.answer(other, request, q.id, q.correctOptionId, "shared-request-id");
    expect((await service.list(actor, request, true)).summary.wrongRemaining).toBe(1);
  });
  it("does not count a retried network request twice", async () => {
    const q = store.questions[0];
    await service.answer(actor, request, q.id, q.correctOptionId, "same");
    await service.answer(actor, request, q.id, q.correctOptionId, "same");
    expect((await service.list(actor, request)).summary.attempted).toBe(1);
    await expect(service.answer(actor, request, q.id, "shape-hexagon", "same")).rejects.toMatchObject({ status: 409 });
  });
  it("does not reveal feedback if answer persistence fails", async () => {
    vi.spyOn(store, "saveAnswer").mockRejectedValueOnce(new Error("database unavailable"));
    await expect(service.answer(actor, request, store.questions[0].id, "shape-circle", "r")).rejects.toThrow("database unavailable");
    expect((await service.list(actor, request)).summary.attempted).toBe(0);
  });
  it("excludes drafts, fixtures and unapproved sources from the real bank", async () => {
    expect((await service.list(actor, { ...request, fixtures: false })).questions).toEqual([]);
    const source = { ...store.questions[0].sourceMaterial, sha256: "a".repeat(64), approvedBy: "reviewer", approvedAt: "2026-09-08" };
    store.questions = [{ ...store.questions[0], isFixture: false, status: "APPROVED", sourceMaterial: source }];
    store.images = [{ ...store.images[0], isFixture: false, status: "APPROVED", sourceMaterial: source }];
    expect((await service.list(actor, { ...request, fixtures: false })).questions).toHaveLength(1);
    store.images[0].status = "REVIEWED";
    expect((await service.list(actor, { ...request, fixtures: false })).questions).toHaveLength(0);
  });
  it("cannot enable development fixtures in production", async () => {
    expect(fixturesAllowed("production", true)).toBe(false);
    expect(fixturesAllowed("development", true)).toBe(true);
    service = createPracticalService(store, async () => ({ id: "renal", studyYear: 1 }), false);
    await expect(service.list(actor, request)).rejects.toMatchObject({ status: 404 });
  });
  it("rejects user IDs, correctness and unsupported formats supplied by clients", () => {
    const body = { questionId: "q", optionId: "a", requestId: "00000000-0000-4000-8000-000000000000" };
    expect(answerBody.safeParse(body).success).toBe(true);
    for (const extra of [{ userId: "another-user" }, { correctOptionId: "a" }, { correct: true }, { answerFormat: "SHORT_ANSWER" }]) expect(answerBody.safeParse({ ...body, ...extra }).success).toBe(false);
    expect(flagBody.safeParse({ questionId: "q", flag: "bookmarked", value: true, userId: "another-user" }).success).toBe(false);
  });
});

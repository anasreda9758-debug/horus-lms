import { describe, it, expect } from "vitest";

/**
 * SM-2 Spaced Repetition Algorithm — extracted for testability.
 * This mirrors the logic in src/features/practice/queries.ts
 */

type ReviewState = {
  easeFactor: number;
  interval: number;
  repetitions: number;
};

const MIN_EF = 130;

function sm2(state: ReviewState, quality: number): ReviewState {
  let { easeFactor: ef, interval, repetitions: reps } = state;

  if (quality >= 3) {
    // Correct
    if (reps === 0) {
      interval = 1;
    } else if (reps === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * (ef / 100));
    }
    reps += 1;
  } else {
    // Incorrect — reset
    reps = 0;
    interval = 0;
  }

  ef = ef + (quality - 3) * 10;
  ef = Math.max(MIN_EF, ef);

  return { easeFactor: ef, interval, repetitions: reps };
}

function calcNextReviewDate(state: ReviewState, quality: number): Date {
  const next = sm2(state, quality);
  const date = new Date();
  if (next.interval > 0) {
    date.setDate(date.getDate() + next.interval);
  } else {
    date.setMinutes(date.getMinutes() + 10);
  }
  return date;
}

describe("SM-2 Spaced Repetition", () => {
  const initial: ReviewState = { easeFactor: 250, interval: 0, repetitions: 0 };

  it("first correct answer: interval=1, reps=1", () => {
    const result = sm2(initial, 4);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
    expect(result.easeFactor).toBe(260); // 250 + (4-3)*10 = 260
  });

  it("first incorrect answer: interval=0, reps=0", () => {
    const result = sm2(initial, 0);
    expect(result.interval).toBe(0);
    expect(result.repetitions).toBe(0);
    expect(result.easeFactor).toBe(220); // 250 + (0-3)*10 = 220
  });

  it("second correct answer: interval=6", () => {
    const after1 = sm2(initial, 4); // reps=1
    const after2 = sm2(after1, 4);  // reps=2
    expect(after2.interval).toBe(6);
    expect(after2.repetitions).toBe(2);
  });

  it("third correct answer: interval scales with EF", () => {
    let state = initial;
    state = sm2(state, 4); // reps=1, interval=1
    state = sm2(state, 4); // reps=2, interval=6
    state = sm2(state, 4); // reps=3, interval=6*(260/100)=16
    expect(state.repetitions).toBe(3);
    expect(state.interval).toBe(16); // Math.round(6 * 2.6)
  });

  it("incorrect resets repetitions and interval", () => {
    let state = initial;
    state = sm2(state, 4); // reps=1
    state = sm2(state, 4); // reps=2
    state = sm2(state, 0); // incorrect → reset
    expect(state.repetitions).toBe(0);
    expect(state.interval).toBe(0);
  });

  it("ease factor never drops below 130", () => {
    let state = initial;
    // Answer incorrectly many times
    for (let i = 0; i < 15; i++) {
      state = sm2(state, 0);
    }
    expect(state.easeFactor).toBe(MIN_EF);
  });

  it("high quality increases EF, low quality decreases it", () => {
    const high = sm2(initial, 5);
    const low = sm2(initial, 2);
    expect(high.easeFactor).toBeGreaterThan(low.easeFactor);
  });

  it("next review date is in the future for correct answers", () => {
    const date = calcNextReviewDate(initial, 4);
    expect(date.getTime()).toBeGreaterThan(Date.now());
  });

  it("next review date is ~10 minutes for incorrect answers", () => {
    const date = calcNextReviewDate(initial, 0);
    const diffMs = date.getTime() - Date.now();
    const diffMin = diffMs / 60000;
    expect(diffMin).toBeGreaterThanOrEqual(9);
    expect(diffMin).toBeLessThanOrEqual(11);
  });
});

import { describe, it, expect } from "vitest";
import { BM25Index } from "./search";
import type { Chunk } from "./chunker";

describe("BM25 Search Index", () => {
  function makeChunks(texts: string[]): Chunk[] {
    return texts.map((text, i) => ({
      id: `c${i}`,
      text,
      lectureId: `l${i % 3}`,
      lectureTitle: `Lecture ${i % 3}`,
      moduleSlug: "test-module",
      startOffset: 0,
    }));
  }

  it("returns empty for empty index", () => {
    const index = new BM25Index();
    index.build([]);
    expect(index.search("query", 5)).toEqual([]);
    expect(index.size).toBe(0);
  });

  it("finds relevant documents", () => {
    const chunks = makeChunks([
      "Cardiovascular system anatomy and physiology",
      "Respiratory system diseases and treatments",
      "Cardiac arrhythmias and ECG interpretation",
      "Renal physiology and acid-base balance",
    ]);
    const index = new BM25Index();
    index.build(chunks);

    const results = index.search("cardiac", 3);
    expect(results.length).toBeGreaterThan(0);
    // Cardiac-related chunks should rank higher
    expect(results[0].chunk.text).toMatch(/cardiac|cardiovascular/i);
  });

  it("respects topK limit", () => {
    const chunks = makeChunks(Array(20).fill("Medical education content about anatomy"));
    const index = new BM25Index();
    index.build(chunks);

    const results = index.search("anatomy", 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("handles Arabic text", () => {
    const chunks = makeChunks([
      "التشريح الطبي للجسم البشري",
      "أمراض الجهاز التنفسي والعلاج",
      "تشخيص اضطرابات القلب衛生",
    ]);
    const index = new BM25Index();
    index.build(chunks);

    const results = index.search("التشريح", 3);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.text).toContain("التشريح");
  });

  it("returns empty for no-match query", () => {
    const chunks = makeChunks(["Cardiovascular anatomy"]);
    const index = new BM25Index();
    index.build(chunks);

    const results = index.search("xyznonexistent", 5);
    expect(results.length).toBe(0);
  });

  it("ranks more relevant documents higher", () => {
    const chunks = makeChunks([
      "The heart has four chambers and pumps blood",
      "Cardiac output is measured in liters per minute",
      "The kidneys filter blood and produce urine",
    ]);
    const index = new BM25Index();
    index.build(chunks);

    const results = index.search("heart cardiac", 3);
    // Heart-related chunks should score higher than kidneys
    expect(results.length).toBeGreaterThanOrEqual(2);
    const top2Texts = results.slice(0, 2).map((r) => r.chunk.text);
    expect(top2Texts.some((t) => t.includes("four chambers"))).toBe(true);
    expect(top2Texts.some((t) => t.includes("Cardiac output"))).toBe(true);
  });

  it("builds index correctly with size", () => {
    const chunks = makeChunks(["a", "b", "c"]);
    const index = new BM25Index();
    index.build(chunks);
    expect(index.size).toBe(3);
  });
});

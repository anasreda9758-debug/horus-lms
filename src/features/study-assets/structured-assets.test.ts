import { describe, expect, it } from "vitest";
import {
  buildStructuredMindmap,
  buildStructuredSummary,
  countSummaryQuality,
} from "./structured-assets";

const source = `Heart (External Features)

The Heart
Position: The heart lies:
• Behind the body of the sternum & adjoining costal cartilages.
• In the middle mediastinum.
• Enclosed by the pericardium.
Direction: its long axis is directed:
• Downwards, forwards and to the left.
Size: equals the size of a closed fist.

External features of the heart
The heart is conical in shape having:
▪ Apex.
▪ Base (posterior surface).
▪ 4 Chambers.
▪ 4 Borders.
▪ 4 Surfaces.
▪ 4 Grooves.`;

describe("structured study assets", () => {
  it("removes headings and preserves complete source-grounded points", () => {
    const summary = buildStructuredSummary("External features of the heart", source);
    const points = summary.sections.flatMap((section) => section.points);

    expect(points.some((point) => point.toLowerCase().includes("behind the body of the sternum"))).toBe(true);
    expect(points.some((point) => point.toLowerCase().includes("downwards"))).toBe(true);
    expect(points.some((point) => point.toLowerCase().includes("closed fist"))).toBe(true);
    expect(points.every((point) => !/^(Position|Direction|Size):?$/i.test(point))).toBe(true);
    expect(countSummaryQuality(summary)).toMatchObject({
      incompleteFragments: 0,
      duplicates: 0,
      emptyHeadings: 0,
    });
  });

  it("builds a relationship-shaped hierarchy instead of one flat list", () => {
    const summary = buildStructuredSummary("External features of the heart", source);
    const mindmap = buildStructuredMindmap("External features of the heart", summary);

    expect(mindmap.children?.length).toBeGreaterThan(1);
    expect(mindmap.children?.every((branch) => (branch.children?.length ?? 0) > 0)).toBe(true);
  });

  it("rejects shallow or malformed material instead of presenting it as approved", () => {
    const summary = buildStructuredSummary("Sparse lecture", "Definition:\nPosition:\nPage 4");
    const quality = countSummaryQuality(summary);

    expect(summary.sections).toHaveLength(0);
    expect(quality.status).toBe("REJECTED");
    expect(quality.maximumHierarchyDepth).toBe(1);
    expect(quality.reasons).toContain("fewer than two logical concept groups were detected");
  });

  it("keeps concept hierarchy and source line references", () => {
    const summary = buildStructuredSummary("Cell membrane", `CELL MEMBRANE
Definition:
Very thin membrane which surrounds the cell.
Functions:
- Exchange of small molecules between the cell and its environment.
- Endocytosis transports macromolecules into the cell.`);
    const map = buildStructuredMindmap("Cell membrane", summary);

    expect(summary.version).toBe(3);
    expect(summary.sections.flatMap((section) => section.concepts ?? []).length).toBeGreaterThan(1);
    expect(map.children?.[0]?.children?.[0]?.children?.length).toBeGreaterThan(0);
    expect(map.children?.[0]?.source?.[0]?.startLine).toBeTypeOf("number");
  });
});

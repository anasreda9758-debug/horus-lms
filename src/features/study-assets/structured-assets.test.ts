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
  it("turns heading fragments into complete source-grounded statements", () => {
    const summary = buildStructuredSummary("External features of the heart", source);
    const points = summary.sections.flatMap((section) => section.points);

    expect(points).toContain(
      "The heart lies behind the body of the sternum & adjoining costal cartilages.",
    );
    expect(points).toContain("The long axis of the heart is directed downwards, forwards and to the left.");
    expect(points).toContain("The heart is approximately the size of a closed fist.");
    expect(points).not.toContain("Position:");
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
});

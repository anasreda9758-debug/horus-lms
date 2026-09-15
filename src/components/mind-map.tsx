"use client";

import { useState } from "react";

type MindmapNode = {
  label: string;
  children?: MindmapNode[];
};

type Props = {
  data: MindmapNode;
};

const COLORS = [
  "#2563eb",
  "#059669",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#0891b2",
];

function MindmapTree({
  node,
  depth,
  colorIndex,
  isRoot,
}: {
  node: MindmapNode;
  depth: number;
  colorIndex: number;
  isRoot?: boolean;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const color = COLORS[colorIndex % COLORS.length];

  return (
    <div className={isRoot ? "" : "relative border-s-2 border-border/60 ps-4"}>
      <button
        onClick={() => hasChildren && setExpanded((e) => !e)}
        className={`group flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-start transition-all hover:bg-muted/50 ${
          isRoot
            ? "mx-auto max-w-xl justify-center bg-primary text-primary-foreground font-bold text-base px-4 py-3 shadow-sm"
            : depth === 1
              ? "bg-primary/10 border border-primary/25 font-semibold"
              : "bg-card border border-border/70"
        }`}
      >
        {hasChildren && !isRoot && (
          <span
            className={`shrink-0 text-[10px] text-muted-foreground transition-transform duration-200 ${
              expanded ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
        )}
        {!isRoot && depth === 1 && (
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        )}
        <span className={isRoot ? "" : depth === 1 ? "text-sm font-semibold leading-relaxed" : "text-sm leading-relaxed text-muted-foreground"}>
          {node.label}
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded && hasChildren ? "max-h-[10000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {hasChildren && (
          <div className={`mt-3 grid gap-3 ${depth === 0 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
            {node.children!.map((child, i) => (
              <MindmapTree
                key={i}
                node={child}
                depth={depth + 1}
                colorIndex={depth === 0 ? i : colorIndex}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MindMap({ data }: Props) {
  return (
    <div className="select-none rounded-2xl bg-muted/20 p-3 sm:p-5">
      <MindmapTree node={data} depth={0} colorIndex={0} isRoot />
    </div>
  );
}

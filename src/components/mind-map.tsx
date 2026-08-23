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
    <div className={isRoot ? "" : "ms-3"}>
      <button
        onClick={() => hasChildren && setExpanded((e) => !e)}
        className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start transition-all hover:bg-muted/50 ${
          isRoot
            ? "bg-primary text-primary-foreground font-bold text-base px-4 py-3 rounded-xl shadow-sm"
            : ""
        }`}
      >
        {!isRoot && (
          <span
            className="h-2 w-2 shrink-0 rounded-full transition-transform group-hover:scale-150"
            style={{ backgroundColor: color }}
          />
        )}
        {hasChildren && !isRoot && (
          <span
            className={`ms-auto shrink-0 text-[10px] text-muted-foreground transition-transform duration-200 ${
              expanded ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
        )}
        <span className={isRoot ? "" : "text-sm font-medium"}>
          {node.label}
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded && hasChildren ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {hasChildren && (
          <div className="relative ms-[14px] border-s-2 border-border/50">
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
    <div className="select-none">
      <MindmapTree node={data} depth={0} colorIndex={0} isRoot />
    </div>
  );
}

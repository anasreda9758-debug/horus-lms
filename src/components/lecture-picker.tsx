"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ReviewLecture } from "@/features/review/queries";

export function LecturePicker({
  lectures,
  value,
  onChange,
  onGenerate,
  busy,
  busyLabel = "جارٍ التوليد…",
}: {
  lectures: ReviewLecture[];
  value: string;
  onChange: (id: string) => void;
  onGenerate: () => void;
  busy: boolean;
  busyLabel?: string;
}) {
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>("");

  // Group by term (1/2 based on module slug) then by module
  const terms = useMemo(() => {
    const termMap = new Map<number, Map<string, ReviewLecture[]>>();
    for (const l of lectures) {
      // Determine term from module slug (rs-201..ibl-204 = term 2)
      const slugNum = parseInt(l.moduleSlug.split("-").pop() ?? "0");
      const term = slugNum >= 200 ? 2 : 1;
      if (!termMap.has(term)) termMap.set(term, new Map());
      const modMap = termMap.get(term)!;
      if (!modMap.has(l.moduleSlug)) modMap.set(l.moduleSlug, []);
      modMap.get(l.moduleSlug)!.push(l);
    }
    return termMap;
  }, [lectures]);

  const availableTerms = [...terms.keys()].sort();
  const activeTerm = selectedTerm ?? availableTerms[0] ?? 1;
  const modulesInTerm = terms.get(activeTerm) ?? new Map();
  const moduleSlugs = [...modulesInTerm.keys()];

  const activeModule = selectedModule || moduleSlugs[0] || "";
  const lecturesInModule: ReviewLecture[] = modulesInTerm.get(activeModule) ?? [];

  const selected = lectures.find((l) => l.id === value);

  return (
    <div className="space-y-3">
      {/* Term Selector */}
      {availableTerms.length > 1 && (
        <div className="flex gap-2">
          {availableTerms.map((t) => (
            <button
              key={t}
              type="button"
              disabled={busy}
              onClick={() => {
                setSelectedTerm(t);
                setSelectedModule("");
                onChange("");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTerm === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              الترم {t}
            </button>
          ))}
        </div>
      )}

      {/* Module Selector */}
      {moduleSlugs.length > 1 && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            الموديول
          </label>
          <select
            value={activeModule}
            disabled={busy}
            onChange={(e) => {
              setSelectedModule(e.target.value);
              onChange("");
            }}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            {moduleSlugs.map((slug) => {
              const first = modulesInTerm.get(slug)?.[0];
              return (
                <option key={slug} value={slug}>
                  {first?.moduleName ?? slug}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Lecture Selector */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label className="text-sm font-medium text-muted-foreground">
            المحاضرة
          </label>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={busy}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            {!selected ? <option value="">— اختر محاضرة —</option> : null}
            {lecturesInModule.map((l) => (
              <option key={l.id} value={l.id}>
                {l.subject ? `${l.subject} · ` : ""}
                {l.title}
              </option>
            ))}
          </select>
        </div>
        <Button disabled={!value || busy} onClick={onGenerate}>
          {busy ? busyLabel : "✨ ولّد"}
        </Button>
      </div>
    </div>
  );
}

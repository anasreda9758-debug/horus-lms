"use client";

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
  const selected = lectures.find((l) => l.id === value);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <label className="text-sm font-medium text-muted-foreground">اختر محاضرة</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={busy}
          className="mt-2 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        >
          {!selected ? <option value="">—</option> : null}
          {lectures.map((l) => (
            <option key={l.id} value={l.id}>
              {l.moduleName} · {l.subject ?? ""} · {l.title}
            </option>
          ))}
        </select>
      </div>
      <Button disabled={!value || busy} onClick={onGenerate}>
        {busy ? busyLabel : "✨ ولّد"}
      </Button>
    </div>
  );
}

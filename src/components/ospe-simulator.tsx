"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type OspeModule = {
  folder: string;
  moduleSlug: string;
  moduleName: string;
  isFree: boolean;
  term: number;
  locked: boolean;
  count: number;
};

type Station = {
  folder: string;
  fileName: string;
  moduleName: string | null;
  moduleSlug: string | null;
  url: string;
};

export function OspeSimulator() {
  const [modules, setModules] = useState<OspeModule[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [station, setStation] = useState<Station | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStation = useCallback(async (folder: string) => {
    setLoading(true);
    setError(null);
    setRevealed(false);
    try {
      const res = await fetch(
        `/api/content/ospe/station?folder=${encodeURIComponent(folder)}`,
      );
      if (!res.ok) {
        setError("لا توجد محطات متاحة لهذه الوحدة.");
        setStation(null);
        return;
      }
      setStation((await res.json()) as Station);
    } catch {
      setError("تعذر تحميل المحطة. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/content/ospe")
      .then((r) => r.json())
      .then((data: { modules: OspeModule[] }) => {
        const unlocked = data.modules.filter((m) => !m.locked);
        setModules(data.modules);
        if (unlocked.length > 0) return loadStation("all");
      })
      .catch(() => setError("تعذر تحميل الوحدات."))
      .finally(() => setLoading(false));
  }, [loadStation]);

  const accessibleCount = modules.filter((m) => !m.locked).length;
  const lockedCount = modules.length - accessibleCount;

  return (
    <div className="grid gap-6">
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              تقييد الوحدة (اختياري)
            </label>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                if (e.target.value === "all") {
                  loadStation("all");
                } else {
                  loadStation(e.target.value);
                }
              }}
              className="mt-2 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">كل الوحدات</option>
              {modules.map((m) => (
                <option key={m.folder} value={m.folder} disabled={m.locked}>
                  {m.moduleName}
                  {m.locked ? " (مدفوع)" : ""} — {m.count} صورة
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => loadStation(filter)} disabled={loading}>
            🎲 محطة جديدة
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          محطات تُراجع هذه الجلسة: {count}
          {lockedCount > 0 ? (
            <span className="ms-2 text-amber-600">
              · {lockedCount} وحدة مدفوعة مؤمنة
            </span>
          ) : null}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-500/10 p-5 text-sm text-red-600 ring-1 ring-red-500/20">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl bg-card p-16 text-center text-muted-foreground ring-1 ring-foreground/10">
          جارٍ تحميل محطة عشوائية…
        </div>
      ) : station ? (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
            <div>
              <h2 className="font-semibold">{station.moduleName}</h2>
              <p className="text-xs text-muted-foreground">{station.fileName}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              OSPE
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary-size images served via streaming API route */}
          <img
            src={station.url}
            alt={`OSPE station ${station.fileName}`}
            className="max-h-[70vh] w-full bg-black object-contain"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
            {revealed ? (
              <p className="text-sm text-muted-foreground">
                وضع المراجعة الذاتية: قارن إجابتك بدفاترك العملية أو الأطلس لهذه
                المحطة.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                حدّد البنية / التشخيص / العلامة، ثم تحقق من نفسك.
              </p>
            )}
            <div className="flex gap-3">
              {revealed ? (
                <Button
                  onClick={() => {
                    setCount((n) => n + 1);
                    loadStation(filter);
                  }}
                >
                  ✅ فهمتها → المحطة التالية
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setRevealed(true)}>
                  👁️ إظهار / مراجعة ذاتية
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

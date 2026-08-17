"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Bank = {
  slug: string;
  title: string;
  moduleName: string;
  moduleSlug: string;
  questionCount: number;
};

type Battle = {
  id: string;
  status: string;
  bankSlug: string;
  questionCount: number;
  createdBy: string;
  participants: { userId: string; userName: string; isReady: boolean }[];
};

type BattleHistory = {
  id: string;
  bankSlug: string;
  myScore: number;
  myTotal: number;
  opponentScore: number;
  opponentName: string;
  won: boolean;
  tied: boolean;
  finishedAt: string;
};

export default function BattlesPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankSlug, setBankSlug] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [activeBattle, setActiveBattle] = useState<Battle | null>(null);
  const [history, setHistory] = useState<BattleHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/quiz/questions")
      .then((r) => r.json())
      .then((data) => {
        const b = data.banks ?? [];
        setBanks(b);
        if (b.length > 0 && !bankSlug) setBankSlug(b[0].slug);
      })
      .catch(() => {});
    fetch("/api/battles")
      .then((r) => r.json())
      .then((data) => setHistory(data.battles ?? []))
      .catch(() => {});
  }, []);

  async function createBattle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", bankSlug, questionCount }),
      });
      const data = await res.json();
      if (data.battleId) {
        const bRes = await fetch(`/api/battles?id=${data.battleId}`);
        const bData = await bRes.json();
        setActiveBattle(bData);
      }
    } catch {
      setError("فشل إنشاء التحدي");
    } finally {
      setLoading(false);
    }
  }

  async function joinBattle(battleId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", battleId }),
      });
      const data = await res.json();
      if (data.battleId) {
        const bRes = await fetch(`/api/battles?id=${data.battleId}`);
        const bData = await bRes.json();
        setActiveBattle(bData);
      }
    } catch {
      setError("فشل الانضمام للتحدي");
    } finally {
      setLoading(false);
    }
  }

  async function setReady() {
    if (!activeBattle) return;
    setLoading(true);
    try {
      const res = await fetch("/api/battles/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId: activeBattle.id }),
      });
      const data = await res.json();
      if (data.started) {
        router.push(`/battles/${activeBattle.id}`);
      } else {
        setActiveBattle((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.map((p) =>
                  p.userId === activeBattle?.participants.find((x) => x.userId !== p.userId)?.userId ? p : { ...p, isReady: true },
                ),
              }
            : prev,
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // Group banks by module
  const grouped = banks.reduce<Record<string, Bank[]>>((acc, b) => {
    (acc[b.moduleName] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">⚔️ تحدي الأقران</h1>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}

      {activeBattle ? (
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <h2 className="mb-4 text-xl font-bold">غرفة التحدي</h2>
          <p className="text-sm text-muted-foreground">
            البنك: {activeBattle.bankSlug} · {activeBattle.questionCount} أسئلة
          </p>
          <div className="mt-4 space-y-2">
            {activeBattle.participants.map((p) => (
              <div key={p.userId} className="flex items-center gap-3 rounded-lg bg-muted px-4 py-2">
                <span className="font-medium">{p.userName}</span>
                <span className={`text-xs ${p.isReady ? "text-green-500" : "text-muted-foreground"}`}>
                  {p.isReady ? "✅ جاهز" : "⏳ في الانتظار"}
                </span>
              </div>
            ))}
          </div>
          {activeBattle.participants.length < 2 ? (
            <p className="mt-4 text-sm text-muted-foreground">في انتظار اللاعب الثاني…</p>
          ) : (
            <button
              onClick={setReady}
              disabled={loading}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "جارٍ…" : "جاهز! 🎯"}
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <h2 className="mb-4 text-xl font-bold">إنشاء تحدي جديد</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">الموديول</label>
              <select
                value={bankSlug}
                onChange={(e) => setBankSlug(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(grouped).map(([modName, modBanks]) => (
                  <optgroup key={modName} label={modName}>
                    {modBanks.map((b) => (
                      <option key={b.moduleSlug} value={b.moduleSlug}>
                        {b.moduleName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">عدد الأسئلة</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value={3}>3 أسئلة</option>
                <option value={5}>5 أسئلة</option>
                <option value={10}>10 أسئلة</option>
              </select>
            </div>
            <button
              onClick={createBattle}
              disabled={loading || !bankSlug}
              className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "جارٍ الإنشاء…" : "⚔️ إنشاء تحدي"}
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">سجل المباريات</h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 ring-1 ${
                  h.won ? "bg-green-500/5 ring-green-500/20" : h.tied ? "bg-muted ring-foreground/10" : "bg-red-500/5 ring-red-500/20"
                }`}
              >
                <div className="text-2xl">{h.won ? "🏆" : h.tied ? "🤝" : "💀"}</div>
                <div className="flex-1">
                  <p className="font-medium">vs {h.opponentName}</p>
                  <p className="text-xs text-muted-foreground">{h.bankSlug}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">
                    {h.myScore}/{h.myTotal}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.opponentScore}/{h.myTotal}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

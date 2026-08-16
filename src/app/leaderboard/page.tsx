"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  totalXp: number;
  level: number;
  battlesWon: number;
  battlesLost: number;
};

type Profile = {
  totalXp: number;
  level: number;
  streak: number;
  battlesWon: number;
  battlesLost: number;
  xpToNext: number;
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myRank, setMyRank] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.leaderboard ?? []);
        setProfile(data.myProfile);
        setMyRank(data.myRank ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">جارٍ التحميل…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">🏆 لوحة المتصدرين</h1>

      {profile && (
        <div className="mb-8 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 p-6 ring-1 ring-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">أداؤك</p>
              <p className="text-2xl font-bold">المستوى {profile.level}</p>
              <p className="text-sm">{profile.totalXp} XP</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">ترتيبك</p>
              <p className="text-2xl font-bold">#{myRank || "—"}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>المستوى {profile.level}</span>
              <span>{profile.xpToNext} XP للمستوى التالي</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-primary/20">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, ((profile.level * 200 - profile.xpToNext) / (profile.level * 200)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {entries.map((e) => (
          <div
            key={e.userId}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 ring-1 transition ${
              e.rank <= 3
                ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/5 ring-yellow-500/20"
                : "bg-card ring-foreground/10"
            }`}
          >
            <div className="w-8 text-center text-lg font-bold">
              {e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : `#${e.rank}`}
            </div>
            <div className="flex-1">
              <p className="font-medium">{e.userName}</p>
              <p className="text-xs text-muted-foreground">
                المستوى {e.level} · {e.battlesWon}W / {e.battlesLost}L
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary">{e.totalXp} XP</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <Link
          href="/battles"
          className="flex-1 rounded-xl bg-primary px-4 py-3 text-center font-medium text-primary-foreground hover:bg-primary/90"
        >
          ⚔️ تحدي صديق
        </Link>
        <Link
          href="/dashboard"
          className="flex-1 rounded-xl bg-muted px-4 py-3 text-center font-medium hover:bg-muted/80"
        >
          📊 العودة للوحة التحكم
        </Link>
      </div>
    </div>
  );
}

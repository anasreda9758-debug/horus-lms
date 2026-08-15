"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LecturePicker } from "@/components/lecture-picker";
import type { ReviewLecture } from "@/features/review/queries";

type DueCard = {
  id: string;
  front: string;
  back: string;
  lectureTitle: string | null;
};

export function FlashcardDeck({ lectures }: { lectures: ReviewLecture[] }) {
  const [lectureId, setLectureId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cards, setCards] = useState<DueCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const loadDue = useCallback(() => {
    fetch("/api/review/flashcards")
      .then((r) => r.json())
      .then((d: { cards: DueCard[] }) => setCards(d.cards))
      .catch(() => {});
  }, []);

  useEffect(loadDue, [loadDue]);

  async function generate() {
    if (!lectureId || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/review/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "تعذر توليد البطاقات.");
        return;
      }
      setNotice(`أُضيفت ${data.count} بطاقة مستحقة اليوم.`);
      loadDue();
      setIndex(0);
      setRevealed(false);
    } finally {
      setBusy(false);
    }
  }

  async function rate(rating: "again" | "good" | "easy") {
    const card = cards[index];
    if (!card) return;
    await fetch("/api/review/flashcards/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id, rating }),
    });
    setRevealed(false);
    if (index + 1 >= cards.length) {
      loadDue();
      setIndex(0);
    } else {
      setIndex((i) => i + 1);
    }
  }

  const card = cards[index];

  return (
    <div className="grid gap-6">
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <LecturePicker
          lectures={lectures}
          value={lectureId}
          onChange={setLectureId}
          onGenerate={generate}
          busy={busy}
        />
        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : notice ? (
          <p className="mt-3 text-sm text-emerald-600">{notice}</p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            يولّد النموذج 12 بطاقة من محتوى المحاضرة، تُجدول تلقائيًا (مرة أخرى بعد يوم، جيد بعد 3 أيام، سهل بعد 7).
          </p>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl bg-card p-10 text-center text-muted-foreground ring-1 ring-foreground/10">
          لا بطاقات مستحقة اليوم. ولّد بطاقات من محاضرة أعلاه.
        </div>
      ) : card ? (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="border-b px-5 py-3 text-sm text-muted-foreground">
            {card.lectureTitle} · بطاقة {index + 1} من {cards.length}
          </div>
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="block w-full cursor-pointer px-5 py-10 text-start"
          >
            <p className="text-2xl font-bold leading-relaxed">{card.front}</p>
            {revealed ? (
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{card.back}</p>
            ) : (
              <p className="mt-6 text-sm text-primary">انقر لإظهار الإجابة</p>
            )}
          </button>
          {revealed ? (
            <div className="flex flex-wrap gap-3 border-t px-5 py-4">
              <Button variant="outline" onClick={() => rate("again")}>مرة أخرى (1 يوم)</Button>
              <Button variant="outline" onClick={() => rate("good")}>جيد (3 أيام)</Button>
              <Button variant="outline" onClick={() => rate("easy")}>سهل (7 أيام)</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

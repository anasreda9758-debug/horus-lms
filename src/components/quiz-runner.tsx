"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock, Pause, Play, Bookmark, BookmarkCheck } from "lucide-react";

type QuizQuestion = {
  id: string;
  prompt: string;
  explanation: string | null;
  difficulty: string;
  order: number;
  options: { id: string; text: string }[];
};

type Feedback = {
  correct: boolean;
  explanation: string | null;
  attemptId: string;
  correctOptionId: string | null;
};

type Result = {
  score: number;
  total: number;
  percent: number;
};

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function difficultyBadge(d: string) {
  if (d === "easy") return { text: "سهل", cls: "bg-emerald-500/10 text-emerald-600" };
  if (d === "hard") return { text: "صعب", cls: "bg-red-500/10 text-red-600" };
  return { text: "متوسط", cls: "bg-amber-500/10 text-amber-600" };
}

export function QuizRunner({
  bankSlug,
  moduleSlug,
  questions,
  timeLimitSec,
  attemptId: initialAttemptId,
}: {
  bankSlug: string;
  moduleSlug: string;
  questions: QuizQuestion[];
  timeLimitSec?: number | null;
  attemptId?: string | null;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(initialAttemptId ?? null);
  const [result, setResult] = useState<Result | null>(null);
  const [answered, setAnswered] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(timeLimitSec ?? 0);
  const [timerPaused, setTimerPaused] = useState(false);
  const questionStartRef = useRef<number>(Date.now());
  const totalElapsedRef = useRef(0);

  const q = questions[index];
  const isLast = index === questions.length - 1;

  // Timer countdown
  useEffect(() => {
    if (!timeLimitSec || timerPaused || result) return;
    if (timeLeft <= 0) {
      // Time's up — auto finish
      finish();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLimitSec, timerPaused, timeLeft, result]);

  // Reset question timer on index change
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [index]);

  async function submit() {
    if (!selected || busy) return;
    setBusy(true);
    const timeSpentMs = Date.now() - questionStartRef.current;
    totalElapsedRef.current += timeSpentMs;
    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankSlug, questionId: q.id, optionId: selected, timeSpentMs, attemptId }),
      });
      if (res.ok) {
        const data = (await res.json()) as Feedback;
        setFeedback(data);
        setAttemptId(data.attemptId);
        setAnswered((n) => n + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    setSelected(null);
    setFeedback(null);
    setIndex((i) => i + 1);
  }

  // Reset bookmark optimistically when the question changes
  // (render-phase adjustment — avoids a cascading setState inside an effect)
  const [bookmarkedForQId, setBookmarkedForQId] = useState<string | undefined>(q?.id);
  if (q?.id !== bookmarkedForQId) {
    setBookmarkedForQId(q?.id);
    setBookmarked(false);
  }

  // Check bookmark status when question changes
  useEffect(() => {
    if (!q?.id) return;
    fetch(`/api/quiz/bookmark?questionId=${q.id}`)
      .then((r) => r.json())
      .then((d: { bookmarked: boolean }) => setBookmarked(d.bookmarked))
      .catch(() => {});
  }, [q?.id]);

  async function toggleBookmark() {
    if (!q?.id) return;
    try {
      const res = await fetch("/api/quiz/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id }),
      });
      if (res.ok) {
        const d = await res.json();
        setBookmarked(d.bookmarked);
      }
    } catch {}
  }

  async function finish() {
    if (!attemptId || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/quiz/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      if (res.ok) {
        setResult((await res.json()) as Result);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <h2 className="text-2xl font-bold">نتيجة الاختبار</h2>
        <p className="mt-3 text-5xl font-bold">
          {result.percent}%
        </p>
        <p className="mt-2 text-muted-foreground">
          {result.score} من {result.total} إجابة صحيحة
        </p>
        {timeLimitSec ? (
          <p className="mt-1 text-sm text-muted-foreground">
            الوقت المستخدم: {formatTime(timeLimitSec - timeLeft)} / {formatTime(timeLimitSec)}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => router.push(`/quiz/${bankSlug}`)}>
            إعادة الاختبار
          </Button>
          <Button onClick={() => router.push(`/quiz/history`)}>
            تاريخ الاختبارات
          </Button>
          <Button onClick={() => router.push(`/curriculum/${moduleSlug}`)}>
            العودة للموديول
          </Button>
        </div>
      </div>
    );
  }

  const diff = difficultyBadge(q.difficulty);

  return (
    <div>
      {/* Header bar */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          السؤال {index + 1} من {questions.length} · أُجيب: {answered}
        </p>
        {timeLimitSec ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setTimerPaused((p) => !p)}
            >
              {timerPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </Button>
            <span className={`flex items-center gap-1 text-sm font-mono ${timeLeft < 30 ? "text-red-500" : "text-muted-foreground"}`}>
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timeLeft)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <div className="flex items-start gap-3">
          <h2 className="flex-1 text-lg font-semibold leading-relaxed">{q.prompt}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={toggleBookmark}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={bookmarked ? "إزالة من المحفوظات" : "حفظ السؤال"}
            >
              {bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
            </button>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${diff.cls}`}>
              {diff.text}
            </span>
          </div>
        </div>

        <ul className="mt-5 grid gap-2">
          {q.options.map((opt) => {
            let cls = "justify-start text-start ring-1 ring-border hover:ring-foreground/30";
            if (feedback) {
              if (feedback.correct && selected === opt.id) {
                cls = "justify-start text-start ring-2 ring-emerald-500 bg-emerald-500/10";
              } else if (!feedback.correct && selected === opt.id) {
                cls = "justify-start text-start ring-2 ring-red-500 bg-red-500/10";
              } else if (!feedback.correct && feedback.correctOptionId === opt.id) {
                cls = "justify-start text-start ring-2 ring-emerald-500 bg-emerald-500/10";
              } else {
                cls = "justify-start text-start ring-1 ring-border opacity-60";
              }
            } else if (selected === opt.id) {
              cls = "justify-start text-start ring-2 ring-primary";
            }
            return (
              <li key={opt.id}>
                <Button
                  variant="ghost"
                  className={cls}
                  disabled={!!feedback || busy || timerPaused}
                  onClick={() => setSelected(opt.id)}
                >
                  {opt.text}
                </Button>
              </li>
            );
          })}
        </ul>

        {feedback ? (
          <div
            className={`mt-4 rounded-lg p-4 text-sm ${
              feedback.correct ? "bg-emerald-500/10" : "bg-red-500/10"
            }`}
          >
            <p className={feedback.correct ? "text-emerald-600" : "text-red-600"}>
              {feedback.correct ? "إجابة صحيحة" : "إجابة خاطئة"}
            </p>
            {feedback.explanation ? (
              <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex justify-between gap-3">
          {feedback ? (
            isLast ? (
              <Button className="ms-auto" onClick={finish} disabled={busy}>
                إنهاء الاختبار
              </Button>
            ) : (
              <Button className="ms-auto" onClick={next}>
                السؤال التالي
              </Button>
            )
          ) : (
            <Button className="ms-auto" onClick={submit} disabled={!selected || busy || timerPaused}>
              إرسال الإجابة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

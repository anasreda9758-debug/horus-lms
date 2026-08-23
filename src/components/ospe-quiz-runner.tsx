"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock, Pause, Play, Stethoscope, CheckCircle2, Bookmark, BookmarkCheck } from "lucide-react";

type QuizQuestion = {
  id: string;
  prompt: string;
  imageUrl: string | null;
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

export function OspeQuizRunner({
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

  const [timeLeft, setTimeLeft] = useState(timeLimitSec ?? 0);
  const [timerPaused, setTimerPaused] = useState(false);
  const questionStartRef = useRef<number>(Date.now());

  const q = questions[index];
  const isLast = index === questions.length - 1;
  const progress = Math.round(((index + 1) / questions.length) * 100);

  useEffect(() => {
    if (!timeLimitSec || timerPaused || result) return;
    if (timeLeft <= 0) {
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

  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [index]);

  async function submit() {
    if (!selected || busy) return;
    setBusy(true);
    const timeSpentMs = Date.now() - questionStartRef.current;
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

  function next() {
    setSelected(null);
    setFeedback(null);
    setIndex((i) => i + 1);
  }

  // Check bookmark status when question changes
  useEffect(() => {
    if (!q?.id) return;
    setBookmarked(false);
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

  // ── Result screen ──
  if (result) {
    const passed = result.percent >= 60;
    return (
      <div className={`rounded-2xl border-2 p-8 text-center ${
        passed
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-red-500/30 bg-red-500/5"
      }`}>
        <Stethoscope className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h2 className="text-2xl font-bold"> نتيجة اختبار OSPE</h2>
        <p className={`mt-3 text-6xl font-bold ${passed ? "text-emerald-600" : "text-red-600"}`}>
          {result.percent}%
        </p>
        <p className="mt-2 text-lg text-muted-foreground">
          {result.score} من {result.total} محطة صحيحة
        </p>
        {passed ? (
          <p className="mt-2 text-sm font-medium text-emerald-600"> نجح</p>
        ) : (
          <p className="mt-2 text-sm font-medium text-red-600"> حاول مرة أخرى</p>
        )}
        {timeLimitSec ? (
          <p className="mt-2 text-sm text-muted-foreground">
            الوقت: {formatTime(timeLimitSec - timeLeft)} / {formatTime(timeLimitSec)}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => router.push(`/quiz/ospe/${moduleSlug}`)}>
            إعادة المحاولة
          </Button>
          <Button onClick={() => router.push("/quiz/ospe")}>
            اختيار موديول آخر
          </Button>
        </div>
      </div>
    );
  }

  const diff = difficultyBadge(q.difficulty);

  return (
    <div className="space-y-4">
      {/* ── Station progress bar ── */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">المحطة {index + 1} / {questions.length}</span>
          {timeLimitSec ? (
            <button
              className="flex items-center gap-1.5"
              onClick={() => setTimerPaused((p) => !p)}
            >
              {timerPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              <span className={`font-mono text-lg font-bold ${timeLeft < 60 ? "text-red-500" : timeLeft < 180 ? "text-amber-500" : "text-foreground"}`}>
                {formatTime(timeLeft)}
              </span>
            </button>
          ) : (
            <span className="text-muted-foreground">{answered} أُجيب</span>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Station dots */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i < index
                  ? "bg-primary"
                  : i === index
                    ? "bg-primary ring-2 ring-primary/30"
                    : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Image (if present) ── */}
      {q.imageUrl ? (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <img
            src={q.imageUrl}
            alt={`Station ${index + 1}`}
            className="max-h-[40vh] w-full bg-black object-contain"
          />
        </div>
      ) : null}

      {/* ── Clinical scenario ── */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold uppercase tracking-wide text-primary">السيناريو السريري</span>
          <button
            onClick={toggleBookmark}
            className="ms-2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={bookmarked ? "إزالة من المحفوظات" : "حفظ السؤال"}
          >
            {bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
          </button>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${diff.cls}`}>
            {diff.text}
          </span>
        </div>
        <p className="text-base leading-relaxed text-foreground">{q.prompt}</p>
      </div>

      {/* ── Options ── */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <p className="mb-3 text-sm font-medium text-muted-foreground">اختر الإجابة الصحيحة:</p>
        <ul className="grid gap-2.5">
          {q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i); // A, B, C, D, E
            let cls = "justify-start text-start gap-3 ring-1 ring-border hover:ring-foreground/30";
            if (feedback) {
              if (feedback.correct && selected === opt.id) {
                cls = "justify-start text-start gap-3 ring-2 ring-emerald-500 bg-emerald-500/10";
              } else if (!feedback.correct && selected === opt.id) {
                cls = "justify-start text-start gap-3 ring-2 ring-red-500 bg-red-500/10";
              } else if (!feedback.correct && feedback.correctOptionId === opt.id) {
                cls = "justify-start text-start gap-3 ring-2 ring-emerald-500 bg-emerald-500/10";
              } else {
                cls = "justify-start text-start gap-3 ring-1 ring-border opacity-50";
              }
            } else if (selected === opt.id) {
              cls = "justify-start text-start gap-3 ring-2 ring-primary bg-primary/5";
            }
            return (
              <li key={opt.id}>
                <Button
                  variant="ghost"
                  className={cls}
                  disabled={!!feedback || busy || timerPaused}
                  onClick={() => setSelected(opt.id)}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {letter}
                  </span>
                  <span className="flex-1 text-start">{opt.text}</span>
                </Button>
              </li>
            );
          })}
        </ul>

        {/* ── Feedback ── */}
        {feedback ? (
          <div className={`mt-5 rounded-lg p-4 text-sm ${feedback.correct ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-4 w-4 ${feedback.correct ? "text-emerald-600" : "text-red-600"}`} />
              <p className={`font-medium ${feedback.correct ? "text-emerald-600" : "text-red-600"}`}>
                {feedback.correct ? "إجابة صحيحة" : "إجابة خاطئة"}
              </p>
            </div>
            {feedback.explanation ? (
              <p className="mt-2 text-muted-foreground leading-relaxed">{feedback.explanation}</p>
            ) : null}
          </div>
        ) : null}

        {/* ── Actions ── */}
        <div className="mt-5 flex justify-end">
          {feedback ? (
            isLast ? (
              <Button size="lg" onClick={finish} disabled={busy} className="px-8">
                إنهاء الاختبار
              </Button>
            ) : (
              <Button size="lg" onClick={next} className="px-8">
                المحطة التالية
              </Button>
            )
          ) : (
            <Button size="lg" onClick={submit} disabled={!selected || busy || timerPaused} className="px-8">
              تأكيد الإجابة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Brain } from "lucide-react";

type ReviewQuestion = {
  reviewId: string;
  questionId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  totalReviews: number;
  correctCount: number;
  prompt: string;
  explanation: string | null;
  difficulty: string;
  bankSlug: string;
  bankTitle: string;
  moduleName: string;
  moduleSlug: string;
  options: { id: string; text: string }[];
};

type Props = {
  questions: ReviewQuestion[];
};

export function ReviewSession({ questions }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

  const q = questions[index];
  const isLast = index === questions.length - 1;
  const progress = Math.round(((index + (submitted ? 1 : 0)) / questions.length) * 100);

  async function submit() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      // Find the correct option
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankSlug: q.bankSlug,
          questionId: q.questionId,
          optionId: selected,
          timeSpentMs: 0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsCorrect(data.correct);
        setSubmitted(true);
        setResults((r) => ({
          correct: r.correct + (data.correct ? 1 : 0),
          total: r.total + 1,
        }));
      }
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (isLast) {
      return;
    }
    setSelected(null);
    setSubmitted(false);
    setIsCorrect(false);
    setIndex((i) => i + 1);
  }

  if (submitted && isLast) {
    return (
      <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-8 text-center">
        <Brain className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h2 className="text-2xl font-bold">اكتملت المراجعة!</h2>
        <p className="mt-3 text-lg text-muted-foreground">
          {results.correct} من {results.total} إجابات صحيحة
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          نسبة الصحة: {results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0}%
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => router.refresh()}>مراجعة مرة أخرى</Button>
          <Button variant="outline" onClick={() => router.push("/quiz/analytics")}>
            عرض التحليلات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">
            سؤال {index + 1} من {questions.length}
          </span>
          <span className="text-muted-foreground">
            {results.correct}/{results.total} صحيحة
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-primary">{q.moduleName} · {q.bankTitle}</span>
          <span className="ms-auto text-xs text-muted-foreground">
            مراجعة #{q.totalReviews + 1}
          </span>
        </div>
        <p className="text-base leading-relaxed text-foreground">{q.prompt}</p>
      </div>

      {/* Options */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <ul className="grid gap-2.5">
          {q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            let cls = "justify-start text-start gap-3 ring-1 ring-border hover:ring-foreground/30";
            if (submitted) {
              // Show correct answer
              const isCorrectOpt = !isCorrect && i === q.options.findIndex((o) => o.id !== selected);
              if (isCorrect) {
                cls = selected === opt.id
                  ? "justify-start text-start gap-3 ring-2 ring-emerald-500 bg-emerald-500/10"
                  : "justify-start text-start gap-3 ring-1 ring-border opacity-50";
              } else {
                if (opt.id === selected) {
                  cls = "justify-start text-start gap-3 ring-2 ring-red-500 bg-red-500/10";
                } else {
                  cls = "justify-start text-start gap-3 ring-1 ring-border opacity-50";
                }
              }
            } else if (selected === opt.id) {
              cls = "justify-start text-start gap-3 ring-2 ring-primary bg-primary/5";
            }
            return (
              <li key={opt.id}>
                <Button
                  variant="ghost"
                  className={cls}
                  disabled={submitted || busy}
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

        {/* Feedback */}
        {submitted && (
          <div className={`mt-4 rounded-lg p-4 text-sm ${isCorrect ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`font-medium ${isCorrect ? "text-emerald-600" : "text-red-600"}`}>
                {isCorrect ? "صحيح!" : "خطأ"}
              </span>
            </div>
            {q.explanation && (
              <p className="mt-2 text-muted-foreground">{q.explanation}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex justify-end">
          {submitted ? (
            <Button size="lg" onClick={next} className="px-8">
              {isLast ? "إنهاء" : "السؤال التالي"}
            </Button>
          ) : (
            <Button size="lg" onClick={submit} disabled={!selected || busy} className="px-8">
              تأكيد
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type QuizQuestion = {
  id: string;
  prompt: string;
  order: number;
  options: { id: string; text: string }[];
};

type Feedback = {
  correct: boolean;
  explanation: string | null;
  attemptId: string;
};

type Result = {
  score: number;
  total: number;
  percent: number;
};

export function QuizRunner({
  bankSlug,
  questions,
}: {
  bankSlug: string;
  questions: QuizQuestion[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [answered, setAnswered] = useState(0);

  const q = questions[index];
  const isLast = index === questions.length - 1;

  async function submit() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankSlug, questionId: q.id, optionId: selected }),
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
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => router.refresh()}>
            إعادة الاختبار
          </Button>
          <Button onClick={() => router.push(`/curriculum/${bankSlug}`)}>
            العودة للموديول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        السؤال {index + 1} من {questions.length} · أُجيب: {answered}
      </p>

      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <h2 className="text-lg font-semibold leading-relaxed">{q.prompt}</h2>

        <ul className="mt-5 grid gap-2">
          {q.options.map((opt) => {
            let cls = "justify-start text-start ring-1 ring-border hover:ring-foreground/30";
            if (feedback) {
              if (feedback.correct && selected === opt.id) {
                cls = "justify-start text-start ring-2 ring-emerald-500 bg-emerald-500/10";
              } else if (!feedback.correct && selected === opt.id) {
                cls = "justify-start text-start ring-2 ring-red-500 bg-red-500/10";
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
                  disabled={!!feedback || busy}
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
            <Button className="ms-auto" onClick={submit} disabled={!selected || busy}>
              إرسال الإجابة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

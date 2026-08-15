"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LecturePicker } from "@/components/lecture-picker";
import type { ReviewLecture } from "@/features/review/queries";

type CaseSummary = {
  id: string;
  caseText: string;
  questions: string[];
  lectureTitle: string | null;
};

export function CaseStudio({ lectures }: { lectures: ReviewLecture[] }) {
  const [lectureId, setLectureId] = useState("");
  const [busy, setBusy] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [caseText, setCaseText] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ score: number | null; feedback: string } | null>(null);
  const [history, setHistory] = useState<CaseSummary[]>([]);

  useEffect(() => {
    fetch("/api/review/cases")
      .then((r) => r.json())
      .then((d: { cases: CaseSummary[] }) => setHistory(d.cases))
      .catch(() => {});
  }, []);

  async function generate() {
    if (!lectureId || busy) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/review/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "تعذر توليد الحالة.");
        return;
      }
      setCaseId(data.caseId);
      setCaseText(data.case);
      setQuestions(data.questions);
      setAnswers(Array(data.questions.length).fill(""));
      fetch("/api/review/cases")
        .then((r) => r.json())
        .then((d: { cases: CaseSummary[] }) => setHistory(d.cases))
        .catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function evaluate() {
    if (!caseId || evaluating) return;
    setEvaluating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/review/cases/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "تعذر التقييم.");
        return;
      }
      setFeedback({ score: data.score, feedback: data.feedback });
    } finally {
      setEvaluating(false);
    }
  }

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
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      {caseText ? (
        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <p className="whitespace-pre-line leading-relaxed">{caseText}</p>
        </div>
      ) : history.length > 0 ? (
        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <h2 className="mb-3 font-semibold">حالاتك الأخيرة</h2>
          <ul className="grid gap-2">
            {history.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCaseId(c.id);
                    setCaseText(c.caseText);
                    setQuestions(c.questions);
                    setAnswers(Array(c.questions.length).fill(""));
                    setFeedback(null);
                  }}
                  className="w-full rounded-lg border px-4 py-3 text-start text-sm ring-1 ring-border hover:ring-foreground/30"
                >
                  <span className="font-medium">{c.lectureTitle ?? "حالة"}</span>
                  <span className="mt-1 block text-muted-foreground">{c.caseText.slice(0, 120)}…</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl bg-card p-10 text-center text-muted-foreground ring-1 ring-foreground/10">
          ولّد حالة سريرية من محاضرة أعلاه، ثم أجب على الأسئلة واحصل على تقييم.
        </div>
      )}

      {caseText && questions.length > 0 ? (
        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <ul className="grid gap-4">
            {questions.map((q, i) => (
              <li key={i}>
                <p className="mb-2 font-medium">{i + 1}. {q}</p>
                <textarea
                  value={answers[i] ?? ""}
                  onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="إجابتك…"
                />
              </li>
            ))}
          </ul>
          <Button className="mt-4" onClick={evaluate} disabled={evaluating}>
            {evaluating ? "جارٍ التقييم…" : "📝 قيّم إجاباتي"}
          </Button>
        </div>
      ) : null}

      {feedback ? (
        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <p className="text-2xl font-bold">
            {feedback.score != null ? `${feedback.score}/100` : "التقييم"}
          </p>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
            {feedback.feedback}
          </p>
        </div>
      ) : null}
    </div>
  );
}

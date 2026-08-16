"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
};

type BattleData = {
  id: string;
  status: string;
  bankSlug: string;
  questionCount: number;
  participants: { userId: string; userName: string; score: number; total: number }[];
};

export default function BattleGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load battle and questions
    fetch(`/api/battles?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setBattle(data);
        // Get questions from the bank
        return fetch(`/api/quiz/${data.bankSlug}/questions?count=${data.questionCount}`);
      })
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setQuestions(data.questions ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function answer() {
    if (!selected || !questions[current]) return;
    setAnswered(true);

    try {
      const res = await fetch("/api/battles/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battleId: id,
          questionId: questions[current].id,
          optionId: selected,
        }),
      });
      const data = await res.json();
      setCorrect(data.correct);
      if (data.correct) setScore((s) => s + 1);
    } catch {
      setCorrect(false);
    }
  }

  function next() {
    if (current + 1 >= questions.length) {
      // Finish battle
      finishBattle();
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
      setCorrect(null);
    }
  }

  async function finishBattle() {
    setFinished(true);
    try {
      const res = await fetch("/api/battles/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId: id }),
      });
      const data = await res.json();
      setResult(data);
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">جارٍ تحميل التحدي…</p>
      </div>
    );
  }

  if (finished && result) {
    const me = battle?.participants.find((p) => p.userId !== result.winnerId);
    const won = result.winnerId && !result.scores[me?.userId ?? ""] ? false : result.winnerId !== null;

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-6xl">{won ? "🏆" : result.winnerId ? "💀" : "🤝"}</p>
          <h1 className="mt-4 text-3xl font-bold">
            {won ? "فزت!" : result.winnerId ? "خسرت!" : "تعادل!"}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            نتيجتك: {score}/{questions.length}
          </p>
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => router.push("/battles")}
              className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90"
            >
              العودة
            </button>
            <button
              onClick={() => router.push("/leaderboard")}
              className="rounded-lg bg-muted px-6 py-2 font-medium hover:bg-muted/80"
            >
              لوحة المتصدرين
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">لا توجد أسئلة متاحة لهذا البنك.</p>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">⚔️ سؤال {current + 1} / {questions.length}</h1>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {score} ✅
        </span>
      </div>

      <div className="mb-6 h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <p className="mb-6 text-lg leading-relaxed">{q.prompt}</p>

        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={opt.id}
              onClick={() => !answered && setSelected(opt.id)}
              disabled={answered}
              className={`w-full rounded-lg border px-4 py-3 text-right text-sm transition ${
                answered && opt.id === selected
                  ? correct
                    ? "border-green-500 bg-green-500/10 text-green-700"
                    : "border-red-500 bg-red-500/10 text-red-700"
                  : answered
                    ? "border-border opacity-50"
                    : selected === opt.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted"
              }`}
            >
              <span className="ms-2 font-medium text-muted-foreground">{String.fromCharCode(65 + i)}.</span>{" "}
              {opt.text}
            </button>
          ))}
        </div>

        {answered && (
          <div className="mt-4 text-center">
            <button
              onClick={next}
              className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90"
            >
              {current + 1 >= questions.length ? "إنهاء التحدي" : "السؤال التالي"}
            </button>
          </div>
        )}

        {!answered && selected && (
          <div className="mt-4 text-center">
            <button
              onClick={answer}
              className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90"
            >
              تأكيد الإجابة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

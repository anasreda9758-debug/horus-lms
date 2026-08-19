"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Station = {
  id: string;
  order: number;
  folder: string;
  fileName: string;
  studentAnswer: string | null;
  score: number | null;
  timeSpentSec: number | null;
};

type ExamData = {
  examId: string;
  stationCount: number;
  totalTimeLimitSec: number;
  timePerStationSec: number;
  status: string;
  stations: Station[];
};

type ExamResult = {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
};

export function ExamMode({ folder }: { folder?: string }) {
  const router = useRouter();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [stationTimeLeft, setStationTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stationStartRef = useRef<number>(Date.now());

  // Global timer
  useEffect(() => {
    if (!exam || exam.status !== "in_progress") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up — auto finish
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [exam?.status]);

  // Station timer
  useEffect(() => {
    if (!exam || exam.status !== "in_progress") return;

    stationTimerRef.current = setInterval(() => {
      setStationTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-advance to next station
          handleSubmitAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (stationTimerRef.current) clearInterval(stationTimerRef.current);
    };
  }, [currentIdx, exam?.status]);

  const startExam = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ospe/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: folder || undefined,
          stationCount: 10,
          timePerStationSec: 60,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "فشل إنشاء الامتحان");
        return;
      }
      const data = await res.json();
      setExam(data);
      setTimeLeft(data.totalTimeLimitSec);
      setStationTimeLeft(data.timePerStationSec);
      stationStartRef.current = Date.now();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = useCallback(async () => {
    if (!exam || submitting) return;
    const station = exam.stations[currentIdx];
    if (!station) return;

    const timeSpent = Math.round((Date.now() - stationStartRef.current) / 1000);
    setSubmitting(true);

    try {
      await fetch(`/api/ospe/exam/${exam.examId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          stationId: station.id,
          answer,
          timeSpentSec: timeSpent,
        }),
      });
    } catch {
      // ignore — answer already submitted
    }

    setAnswer("");
    if (currentIdx < exam.stations.length - 1) {
      setCurrentIdx((i) => i + 1);
      setStationTimeLeft(exam.timePerStationSec);
      stationStartRef.current = Date.now();
    } else {
      // Last station — finish exam
      handleFinish();
    }
    setSubmitting(false);
  }, [exam, currentIdx, answer, submitting]);

  const handleFinish = useCallback(async () => {
    if (!exam) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (stationTimerRef.current) clearInterval(stationTimerRef.current);

    try {
      const res = await fetch(`/api/ospe/exam/${exam.examId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish" }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setExam((prev) => (prev ? { ...prev, status: "completed" } : null));
      }
    } catch {
      setError("تعذر إنهاء الامتحان");
    }
  }, [exam]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // No exam yet — show start screen
  if (!exam) {
    return (
      <div className="rounded-xl bg-card p-8 text-center ring-1 ring-foreground/10">
        <h2 className="mb-2 text-2xl font-bold">وضع الامتحان</h2>
        <p className="mb-6 text-muted-foreground">
          امتحان صارم — لا يمكن التراجع عن الإجابة، والوقت محدد لكل محطة.
        </p>
        <div className="mb-6 grid grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg bg-muted p-3">
            <div className="text-lg font-bold">10</div>
            <div className="text-muted-foreground">محطات</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-lg font-bold">60 ثانية</div>
            <div className="text-muted-foreground">لكل محطة</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-lg font-bold">10 دقائق</div>
            <div className="text-muted-foreground">المجموع</div>
          </div>
        </div>
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</div>
        )}
        <Button onClick={startExam} disabled={loading} size="lg">
          {loading ? "جارٍ إنشاء الامتحان…" : "ابدأ الامتحان"}
        </Button>
      </div>
    );
  }

  // Exam completed — show results
  if (exam.status === "completed" && result) {
    return (
      <div className="rounded-xl bg-card p-8 text-center ring-1 ring-foreground/10">
        <h2 className="mb-4 text-2xl font-bold">نتيجة الامتحان</h2>
        <div className="mb-6 flex items-center justify-center gap-8">
          <div>
            <div className="text-5xl font-bold text-primary">{result.percentage}%</div>
            <div className="text-muted-foreground">النسبة</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{result.totalScore} / {result.maxPossibleScore}</div>
            <div className="text-muted-foreground">النقاط</div>
          </div>
        </div>
        <div className="mb-6 grid grid-cols-10 gap-2">
          {exam.stations.map((s, i) => (
            <div
              key={s.id}
              className={`rounded-lg p-2 text-center text-xs font-medium ${
                (s.score ?? 0) > 0
                  ? "bg-green-500/20 text-green-700"
                  : "bg-red-500/20 text-red-700"
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <Button onClick={() => router.refresh()} size="lg">
          امتحان جديد
        </Button>
      </div>
    );
  }

  // Exam in progress — show current station
  const station = exam.stations[currentIdx];
  const isTimeWarning = stationTimeLeft <= 10;
  const progress = ((currentIdx + 1) / exam.stations.length) * 100;

  return (
    <div className="grid gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-xl bg-card px-5 py-3 ring-1 ring-foreground/10">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">
            المحطة {currentIdx + 1} / {exam.stations.length}
          </span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`font-mono text-lg font-bold ${
              isTimeWarning ? "text-red-600" : "text-muted-foreground"
            }`}
          >
            {formatTime(stationTimeLeft)}
          </span>
          <span className="text-xs text-muted-foreground">
            المتبقي: {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Station image */}
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="border-b px-5 py-3">
          <h3 className="font-semibold">{station.folder} — {station.fileName}</h3>
        </div>
        <img
          src={`/api/content/ospe/image?folder=${encodeURIComponent(station.folder)}&file=${encodeURIComponent(station.fileName)}`}
          alt={`Station ${currentIdx + 1}`}
          className="max-h-[50vh] w-full bg-black object-contain"
        />
      </div>

      {/* Answer input */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          إجابتك
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="اكتب التشخيص وال양اتريفت هنا..."
          className="h-32 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-3 flex items-center justify-between">
          <Button
            variant="destructive"
            onClick={handleFinish}
            size="sm"
          >
            إنهاء الامتحان
          </Button>
          <Button
            onClick={handleSubmitAnswer}
            disabled={submitting}
          >
            {submitting ? "جارٍ الإرسال…" : currentIdx === exam.stations.length - 1 ? "إرسال و完结" : "المحطة التالية"}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Message = { role: "user" | "assistant"; content: string };

export function TutorChat({ lectureId }: { lectureId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const content = input.trim();
    if (!content || busy) return;
    setBusy(true);
    setError(null);
    const history: Message[] = [...messages, { role: "user" as const, content }];
    setMessages(history);
    setInput("");
    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureId, messages: history }),
      });
      if (res.status === 429) {
        const data = await res.json();
        setLimitReached(true);
        setError(data.message ?? "وصلت إلى الحد المجاني اليوم.");
        return;
      }
      if (!res.ok) {
        setError("حدث خطأ أثناء الاتصال بالمعلم الذكي. حاول مجددًا.");
        return;
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setError("تعذّر الاتصال بالمعلم الذكي.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="flex h-80 flex-col gap-3 overflow-y-auto pe-2">
        {messages.length === 0 ? (
          <p className="m-auto text-sm text-muted-foreground">
            ابدأ بسؤال عن محتوى هذه المحاضرة…
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-xl px-4 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-muted"
              }`}
            >
              {m.content}
            </div>
          ))
        )}
        {busy ? (
          <div className="self-start rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground">
            جارٍ الكتابة…
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p>
      ) : null}

      {!limitReached ? (
        <div className="mt-4 flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="اكتب سؤالك هنا…"
            disabled={busy}
          />
          <Button onClick={send} disabled={busy || !input.trim()}>
            إرسال
          </Button>
        </div>
      ) : null}
    </div>
  );
}

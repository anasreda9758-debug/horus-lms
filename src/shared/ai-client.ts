import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

const groq = createOpenAICompatible({
  name: "groq",
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

const model = groq.chatModel(process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile");

export type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function generateTutorReply(params: {
  system: string;
  messages: TutorMessage[];
}) {
  const { text, usage } = await generateText({
    model,
    system: params.system,
    messages: params.messages,
  });

  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;

  return { text, inputTokens, outputTokens };
}

// One-shot structured generation: asks the model for pure JSON and parses it,
// stripping any markdown fences the model wraps it in.
export async function generateJson<T>(params: { system: string; user: string }) {
  const { text, usage } = await generateText({
    model,
    system: params.system,
    prompt: params.user,
  });

  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;

  const cleaned = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
  let data: T | null = null;
  try {
    data = JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        data = JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        data = null;
      }
    }
  }

  return { data, inputTokens, outputTokens };
}

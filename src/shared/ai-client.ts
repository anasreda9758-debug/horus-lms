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

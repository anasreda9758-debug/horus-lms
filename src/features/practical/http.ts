import { z } from "zod";
import { PracticalError, type RequestScope } from "./service";
export function requestScope(url: URL): RequestScope {
  return { moduleSlug: url.searchParams.get("module") ?? "", subject: url.searchParams.get("subject") ?? "", fixtures: url.searchParams.get("fixtures") === "1" };
}
export const answerBody = z.object({ questionId: z.string().min(1).max(160), optionId: z.string().min(1).max(160), requestId: z.string().uuid() }).strict();
export const flagBody = z.object({ questionId: z.string().min(1).max(160), flag: z.enum(["bookmarked", "difficult"]), value: z.boolean() }).strict();
export const privateHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
export function practicalFailure(error: unknown) {
  const status = error instanceof PracticalError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503;
  return Response.json({ error: status === 503 ? "Practical is not ready. Check the additive pilot setup; no answer was confirmed." : status === 400 ? "Invalid practical request" : (error as Error).message }, { status, headers: privateHeaders });
}

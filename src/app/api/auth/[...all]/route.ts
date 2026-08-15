import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";
import { auth } from "@/shared/auth";
import { logger } from "@/shared/logger";

const handlers = toNextJsHandler(auth);

type AuthHandler = (
  request: NextRequest,
  context: { params: Promise<{ all: string[] }> },
) => Promise<Response>;

const wrap =
  (handler: AuthHandler): AuthHandler =>
  async (request, context) => {
    const start = performance.now();
    const res = await handler(request, context);
    logger.info(
      {
        method: request.method,
        path: new URL(request.url).pathname,
        status: res.status,
        durationMs: Math.round(performance.now() - start),
      },
      "api.auth",
    );
    return res;
  };

export const GET = wrap(handlers.GET as AuthHandler);
export const POST = wrap(handlers.POST as AuthHandler);

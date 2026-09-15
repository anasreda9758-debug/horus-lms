import { randomBytes } from "node:crypto";
import { eq, and, desc, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { auth } from "@/shared/auth";
import { verification, passwordResetChallenge, user } from "./schema";
import { logger } from "@/shared/logger";
import {
  PASSWORD_RESET_CODE_TTL_MS,
  PASSWORD_RESET_MAX_ATTEMPTS,
  PASSWORD_RESET_RESEND_COOLDOWN_MS,
  codesMatch,
  formatVerificationCode,
  generateVerificationCode,
  hashRecoveryValue,
  normalizeRecoveryEmail,
  secureCodeHash,
} from "./password-recovery-rules";

export const PASSWORD_RESET_MESSAGE =
  "If an account exists for this email, we've sent a verification code.";

function clientKey(email: string, ip: string) {
  return hashRecoveryValue(`${normalizeRecoveryEmail(email)}:${ip}`);
}

async function sendResetCode(email: string, code: string) {
  const subject = "VYLO password reset code";
  const text = [
    "Your VYLO verification code is:",
    "",
    code,
    "",
    "This code expires in 10 minutes.",
    "",
    "If you didn't request a password reset, you can ignore this email.",
  ].join("\n");
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (apiKey && from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [email], subject, text }),
    });
    if (!response.ok) throw new Error(`Password reset email failed (${response.status})`);
    return;
  }

  if (process.env.NODE_ENV === "production") {
    logger.warn({ event: "PASSWORD_RESET_EMAIL_NOT_CONFIGURED" }, "Password reset email provider is not configured");
    return;
  }

  logger.info({ passwordResetCode: code }, "Development password reset code");
}

export async function createPasswordResetChallenge(email: string, ip: string) {
  const normalizedEmail = normalizeRecoveryEmail(email);
  const key = clientKey(normalizedEmail, ip);
  const now = new Date();
  const recent = await db.query.passwordResetChallenge.findFirst({
    where: and(eq(passwordResetChallenge.requestKeyHash, key), gt(passwordResetChallenge.createdAt, new Date(now.getTime() - PASSWORD_RESET_RESEND_COOLDOWN_MS))),
    orderBy: [desc(passwordResetChallenge.createdAt)],
  });
  if (recent) return { limited: true as const, challengeId: recent.id };

  const foundUser = await db.query.user.findFirst({
    where: eq(user.email, normalizedEmail),
    columns: { id: true },
  });
  const code = formatVerificationCode(generateVerificationCode());
  const challengeId = randomBytes(18).toString("hex");
  await db.update(passwordResetChallenge)
    .set({ invalidatedAt: now })
    .where(and(eq(passwordResetChallenge.email, normalizedEmail), isNull(passwordResetChallenge.invalidatedAt), isNull(passwordResetChallenge.consumedAt)));
  await db.insert(passwordResetChallenge).values({
    id: challengeId,
    email: normalizedEmail,
    userId: foundUser?.id ?? null,
    requestKeyHash: key,
    codeHash: secureCodeHash(code),
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_CODE_TTL_MS),
    lastSentAt: now,
  });
  if (foundUser) await sendResetCode(normalizedEmail, code);
  return { limited: false as const, challengeId };
}

export async function resendPasswordResetChallenge(challengeId: string) {
  const challenge = await db.query.passwordResetChallenge.findFirst({
    where: eq(passwordResetChallenge.id, challengeId),
  });
  if (!challenge || challenge.invalidatedAt || challenge.consumedAt || challenge.verifiedAt) {
    return { ok: false as const, reason: "INVALID_CHALLENGE" as const };
  }
  const now = new Date();
  if (now.getTime() - challenge.lastSentAt.getTime() < PASSWORD_RESET_RESEND_COOLDOWN_MS) {
    return { ok: false as const, reason: "COOLDOWN" as const };
  }
  const code = formatVerificationCode(generateVerificationCode());
  await db.update(passwordResetChallenge).set({
    codeHash: secureCodeHash(code),
    attempts: 0,
    lastSentAt: now,
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_CODE_TTL_MS),
  }).where(eq(passwordResetChallenge.id, challengeId));
  if (challenge.userId) await sendResetCode(challenge.email, code);
  return { ok: true as const };
}

export async function verifyPasswordResetCode(challengeId: string, code: string) {
  const challenge = await db.query.passwordResetChallenge.findFirst({
    where: eq(passwordResetChallenge.id, challengeId),
  });
  const now = new Date();
  if (!challenge || challenge.invalidatedAt || challenge.consumedAt || challenge.verifiedAt) {
    return { ok: false as const, reason: "INVALID_CODE" as const };
  }
  if (challenge.expiresAt <= now) return { ok: false as const, reason: "EXPIRED" as const };
  if (challenge.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) return { ok: false as const, reason: "TOO_MANY_ATTEMPTS" as const };

  const updated = await db.update(passwordResetChallenge)
    .set({ attempts: sql`${passwordResetChallenge.attempts} + 1` })
    .where(and(eq(passwordResetChallenge.id, challengeId), sql`${passwordResetChallenge.attempts} < ${PASSWORD_RESET_MAX_ATTEMPTS}`, isNull(passwordResetChallenge.invalidatedAt), isNull(passwordResetChallenge.verifiedAt)))
    .returning({ id: passwordResetChallenge.id });
  if (updated.length === 0) return { ok: false as const, reason: "TOO_MANY_ATTEMPTS" as const };
  if (!codesMatch(challenge.codeHash, code.replace(/\D/g, ""))) return { ok: false as const, reason: "INVALID_CODE" as const };

  const resetToken = randomBytes(32).toString("hex");
  await db.transaction(async (tx) => {
    await tx.update(passwordResetChallenge).set({
      verifiedAt: now,
      resetTokenHash: hashRecoveryValue(resetToken),
    }).where(eq(passwordResetChallenge.id, challengeId));
    if (challenge.userId) {
      await tx.insert(verification).values({
        id: randomBytes(18).toString("hex"),
        identifier: `reset-password:${resetToken}`,
        value: challenge.userId,
        expiresAt: new Date(now.getTime() + PASSWORD_RESET_CODE_TTL_MS),
      });
    }
  });
  if (!challenge.userId) return { ok: false as const, reason: "INVALID_CODE" as const };
  return { ok: true as const, resetToken };
}

export async function completePasswordReset(resetToken: string, newPassword: string) {
  const tokenHash = hashRecoveryValue(resetToken);
  const challenge = await db.query.passwordResetChallenge.findFirst({
    where: and(eq(passwordResetChallenge.resetTokenHash, tokenHash), isNull(passwordResetChallenge.consumedAt)),
  });
  if (!challenge || !challenge.userId || !challenge.verifiedAt || challenge.expiresAt <= new Date()) {
    return { ok: false as const, reason: "INVALID_RESET" as const };
  }
  try {
    await auth.api.resetPassword({ body: { token: resetToken, newPassword } });
  } catch {
    return { ok: false as const, reason: "INVALID_RESET" as const };
  }
  await db.update(passwordResetChallenge).set({ consumedAt: new Date() }).where(eq(passwordResetChallenge.id, challenge.id));
  logger.info({ event: "PASSWORD_RESET_COMPLETED", userId: challenge.userId }, "Password reset completed");
  return { ok: true as const };
}

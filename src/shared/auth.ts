import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "../db/schema";

async function sendVerificationOTP(data: {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Email verification is not configured");
  }

  const isEmailVerification = data.type === "email-verification";
  const subject = isEmailVerification
    ? "Verify your VYLO email"
    : "VYLO verification code";
  const text = [
    "VYLO",
    "",
    isEmailVerification
      ? "Your VYLO email verification code is:"
      : "Your VYLO verification code is:",
    data.otp,
    "",
    "This code expires in 10 minutes.",
    isEmailVerification
      ? "If you did not create a VYLO account, you can ignore this email."
      : "If you did not request this code, you can ignore this email.",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [data.email],
      subject,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Verification email failed (${response.status})`);
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    emailVerification: {
      sendOnSignIn: true,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // sliding renewal daily
  },
  advanced: {
    cookiePrefix: "lms",
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/*": { window: 60, max: 30 },
        "/sign-up/*": { window: 60, max: 20 },
        "/change-password/*": { window: 60, max: 10 },
        "/change-email/*": { window: 60, max: 10 },
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      resendStrategy: "rotate",
      overrideDefaultEmailVerification: true,
      sendVerificationOnSignUp: true,
      rateLimit: { window: 60, max: 1 },
      sendVerificationOTP,
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type ActiveUser = typeof auth.$Infer.Session.user;

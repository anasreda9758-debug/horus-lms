import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
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
});

export type Session = typeof auth.$Infer.Session;
export type ActiveUser = typeof auth.$Infer.Session.user;

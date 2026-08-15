import "dotenv/config";
import { eq } from "drizzle-orm";
import { auth } from "../src/shared/auth";
import { db } from "../src/shared/db";
import { user } from "../src/features/auth/schema";

const email = process.env.ADMIN_EMAIL ?? "admin@horus.edu.eg";
const password = process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin2026";
const name = process.env.ADMIN_NAME ?? "Platform Admin";

async function main() {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing.length > 0) {
    await db.update(user).set({ role: "admin" }).where(eq(user.email, email));
    console.log(`[seed-admin] '${email}' promoted to admin`);
    process.exit(0);
  }

  const headers = new Headers({ origin: "http://localhost:3000" });
  const res = await auth.api.signUpEmail({
    body: { email, password, name },
    headers,
  });

  if (!res.user) {
    console.error("[seed-admin] signUpEmail failed:", JSON.stringify(res));
    process.exit(1);
  }

  await db.update(user).set({ role: "admin" }).where(eq(user.email, email));
  console.log(`[seed-admin] admin created: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-admin] error:", err);
  process.exit(1);
});

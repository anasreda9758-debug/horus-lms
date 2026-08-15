// Persistent E2E suite. Requires the app running on the BASE URL and migrations applied.
//   node scripts/e2e.mjs            (against http://localhost:3000)
//   node scripts/e2e.mjs <baseUrl>  (e.g. the staging host)
// AI-tutor calls run only when GROQ_API_KEY is set (they consume quota).
import "dotenv/config";
import postgres from "postgres";

const BASE = (process.argv[2] ?? process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const cookieName = "lms.session_token";
const adminEmail = process.env.ADMIN_EMAIL ?? "admin@horus.edu.eg";
const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin2026";

let passed = 0;
let failed = 0;
function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`PASS ${name}`);
  } else {
    failed++;
    console.log(`FAIL ${name} ${extra}`);
  }
}

function cookieOf(res) {
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of set) if (c.startsWith(cookieName + "=")) return c.split(";")[0];
  return null;
}

async function signIn(email, password) {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
  if (res.status !== 200) throw new Error(`sign-in ${email}: HTTP ${res.status}`);
  return cookieOf(res);
}

async function signUp(email, password, name) {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password, name }),
    redirect: "manual",
  });
  if (res.status !== 200) throw new Error(`sign-up ${email}: HTTP ${res.status}`);
  return cookieOf(res);
}

async function getPage(path, cookie) {
  return fetch(`${BASE}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
let studentId = null;

try {
  // ---- smoke / health ----
  let r = await fetch(`${BASE}/api/health`);
  let json = await r.json().catch(() => ({}));
  check("health ok", r.status === 200 && json.ok === true, `status=${r.status}`);

  r = await getPage("/sign-in");
  check("sign-in page 200 anon", r.status === 200, `status=${r.status}`);
  r = await getPage("/dashboard");
  check("dashboard redirects anon", r.status === 307 || r.status === 302 || r.url.includes("/sign-in"), `status=${r.status}`);

  // ---- auth ----
  r = await getPage("/api/auth/get-session");
  const anonSession = await r.json().catch(() => null);
  check("anon has no session", r.status === 200 && (anonSession === null || anonSession.user == null));

  const email = `e2e${Date.now()}@e2e.local`;
  const studentCookie = await signUp(email, "Passw0rd!2026", "E2E Student");
  const me = await (await getPage("/api/auth/get-session", studentCookie)).json();
  studentId = me?.user?.id;
  check("sign-up creates session", !!studentId);

  r = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: "wrong-password" }),
    redirect: "manual",
  });
  check("wrong password 401", r.status === 401, `status=${r.status}`);

  // ---- curriculum + progress ----
  const mods = await sql`select m.slug, m.is_free, count(l.id)::int as lectures from module m left join lecture l on l.module_id=m.id group by m.id order by m.is_free, lectures desc`;
  const freeMod = mods.find((m) => m.is_free && m.lectures > 0);
  const premiumMod = mods.find((m) => !m.is_free && m.lectures > 0);
  check("seed data present (free+premium)", !!freeMod && !!premiumMod);

  if (freeMod) {
    const lectures = await sql`select l.id, l.slug, l.title from lecture l join module m on m.id=l.module_id where m.slug=${freeMod.slug} limit 2`;
    check("free module has lectures", lectures.length > 0);
    if (lectures.length > 0) {
      r = await fetch(`${BASE}/api/curriculum/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: studentCookie },
        body: JSON.stringify({ lectureId: lectures[0].id }),
      });
      check("toggle lecture", r.status === 200, `status=${r.status}`);
    }
  }

  // ---- quiz (free module) ----
  const freeBanks = await sql`select b.slug from question_bank b join module m on m.id=b.module_id where m.is_free=true limit 1`;
  if (freeBanks[0]) {
    const page = await (await getPage(`/quiz/${freeBanks[0].slug}`, studentCookie)).text();
    check("free quiz page renders", page.includes("سؤالًا"));
  }

  // ---- entitlements (M5) ----
  let html;
  const premLectures = await sql`select l.id, l.slug, l.title from lecture l join module m on m.id=l.module_id where m.is_free=false limit 1`;
  const premLec = premLectures[0];
  check("premium lecture seeded", !!premLec);
  if (premLec && premiumMod) {
    const premOwnLectures = await sql`select l.id, l.slug, l.title from lecture l join module m on m.id=l.module_id where m.slug=${premiumMod.slug} limit 1`;
    const premOwnLec = premOwnLectures[0];
    if (premOwnLec) {
      const titleEsc = premOwnLec.title.replace(/&/g, "&amp;");
      html = await (await getPage(`/curriculum/${premiumMod.slug}`, studentCookie)).text();
      check("premium module locked", html.includes("هذا الموديول بريميوم"));
      check("premium module hides lectures", !html.includes(premOwnLec.title) && !html.includes(titleEsc));

      r = await fetch(`${BASE}/api/tutor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: studentCookie },
        body: JSON.stringify({ lectureId: premOwnLec.id, messages: [{ role: "user", content: "ما هو التنفس؟" }] }),
      });
      check("tutor premium 403 for free user", r.status === 403, `status=${r.status}`);

      const adminCookie = await signIn(adminEmail, adminPassword);
      r = await fetch(`${BASE}/api/admin/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({ action: "activate", userId: studentId, planId: "monthly" }),
      });
      check("admin activate premium", r.status === 200, `status=${r.status}`);

      html = await (await getPage(`/curriculum/${premiumMod.slug}`, studentCookie)).text();
      check("premium unlocked after activate", html.includes(premOwnLec.title) || html.includes(titleEsc));

      await sql`update subscription set expires_at=now()-interval '1 day' where user_id=${studentId} and status='active'`;
      html = await (await getPage(`/curriculum/${premiumMod.slug}`, studentCookie)).text();
      check("expired locks again", html.includes("هذا الموديول بريميوم"));

      r = await fetch(`${BASE}/api/admin/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({ action: "deactivate", userId: studentId }),
      });
      check("admin deactivate", r.status === 200, `status=${r.status}`);
    }

    r = await fetch(`${BASE}/api/admin/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate", userId: studentId }),
    });
    check("admin API 401 anon", r.status === 401, `status=${r.status}`);
  }

  // ---- OSPE simulator ----
  const ospeModules = await (await getPage("/api/content/ospe", studentCookie)).json();
  const freeOspe = ospeModules?.modules?.find((m) => m.isFree);
  const premOspe = ospeModules?.modules?.find((m) => !m.isFree);
  check("ospe lists modules", !!freeOspe && !!premOspe);
  if (freeOspe && premOspe) {
    check("ospe free module unlocked", freeOspe.locked === false && freeOspe.count > 0);
    check("ospe premium module locked for free user", premOspe.locked === true);

    const station = await (await getPage("/api/content/ospe/station", studentCookie)).json();
    check("ospe station returns image url", !!station?.url && !!station?.folder);

    r = await getPage(`/api/content/ospe/station?folder=${encodeURIComponent(premOspe.folder)}`, studentCookie);
    check("ospe premium station 403 for free user", r.status === 403, `status=${r.status}`);

    if (station?.url) {
      r = await getPage(station.url, studentCookie);
      check(
        "ospe image serves 200",
        r.status === 200 && (r.headers.get("content-type") ?? "").startsWith("image/"),
        `status=${r.status} ct=${r.headers.get("content-type")}`,
      );
      r = await getPage(station.url);
      check("ospe image anon 401", r.status === 401, `status=${r.status}`);
    }
    r = await getPage(`/api/content/ospe/image?folder=${encodeURIComponent(freeOspe.folder)}&file=../../app.py`, studentCookie);
    check("ospe image path traversal rejected", r.status === 400, `status=${r.status}`);
  }

  // ---- AI tutor (optional, needs GROQ_API_KEY) ----
  if (process.env.GROQ_API_KEY) {
    const freeLectures = await sql`select l.id from lecture l join module m on m.id=l.module_id where m.is_free=true and l.content is not null and length(l.content)>0 limit 1`;
    if (freeLectures[0]) {
      const res = await fetch(`${BASE}/api/tutor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: studentCookie },
        body: JSON.stringify({
          lectureId: freeLectures[0].id,
          messages: [{ role: "user", content: "اختصِر هذه المحاضرة في جملة." }],
        }),
      });
      const tutorJson = await res.json().catch(() => ({}));
      check(
        "tutor free lecture reply (GROQ)",
        res.status === 200 && typeof tutorJson.reply === "string" && tutorJson.reply.length > 0,
        `status=${res.status}`,
      );

      // ---- review (flashcards + clinical cases, needs GROQ) ----
      const pages = ["/flashcards", "/cases"];
      for (const p of pages) {
        const page = await getPage(p, studentCookie);
        check(`review page ${p} renders`, page.status === 200, `status=${page.status}`);
      }

      r = await fetch(`${BASE}/api/review/flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: studentCookie },
        body: JSON.stringify({ lectureId: freeLectures[0].id }),
      });
      const fcJson = await r.json().catch(() => ({}));
      check("flashcards generate (GROQ)", r.status === 200 && fcJson.count > 0, `status=${r.status}`);

      const due = await (await getPage("/api/review/flashcards", studentCookie)).json();
      check("flashcards due listed", Array.isArray(due.cards) && due.cards.length > 0);
      if (due.cards?.[0]) {
        r = await fetch(`${BASE}/api/review/flashcards/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: studentCookie },
          body: JSON.stringify({ cardId: due.cards[0].id, rating: "good" }),
        });
        check("flashcard review", r.status === 200, `status=${r.status}`);
      }

      r = await fetch(`${BASE}/api/review/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: studentCookie },
        body: JSON.stringify({ lectureId: freeLectures[0].id }),
      });
      const caseJson = await r.json().catch(() => ({}));
      check(
        "clinical case generate (GROQ)",
        r.status === 200 && !!caseJson.caseId && Array.isArray(caseJson.questions),
        `status=${r.status}`,
      );
      if (caseJson.caseId) {
        r = await fetch(`${BASE}/api/review/cases/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: studentCookie },
          body: JSON.stringify({
            caseId: caseJson.caseId,
            answers: caseJson.questions.map((_q, i) => `answer ${i + 1}`),
          }),
        });
        const evalJson = await r.json().catch(() => ({}));
        check(
          "clinical case evaluate (GROQ)",
          r.status === 200 && typeof evalJson.feedback === "string" && evalJson.feedback.length > 0,
          `status=${r.status}`,
        );
      }
    }
  } else {
    console.log("SKIP tutor (GROQ_API_KEY not set)");
  }
} finally {
  if (studentId) {
    await sql.unsafe(`delete from "user" where id = $1`, [studentId]).catch(() => {});
  }
  await sql.end().catch(() => {});
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

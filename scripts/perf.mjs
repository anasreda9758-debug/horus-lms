// LCP budget check (M6: LCP < 2.5s). Requires the app running and Playwright's
// chromium installed (`npx playwright install chromium`). Exits non-zero if any
// measured page exceeds LCP_BUDGET_MS.
//   node scripts/perf.mjs                 (localhost:3000)
//   node scripts/perf.mjs <baseUrl> <studentEmail> <password>
import "dotenv/config";
import { chromium } from "playwright";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const STUDENT_EMAIL = process.argv[3] ?? process.env.E2E_STUDENT_EMAIL ?? "student100@test.horus.edu.eg";
const STUDENT_PASSWORD = process.argv[4] ?? process.env.E2E_STUDENT_PASSWORD ?? "Passw0rd!2026";
const LCP_BUDGET_MS = Number(process.env.LCP_BUDGET_MS ?? 2500);
const RUNS = 3;

async function measureLcp(browser, url, { cookie = null } = {}) {
  const samples = [];
  for (let i = 0; i < RUNS; i++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    if (cookie) await context.addCookies([cookie]);
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__lcp = new Promise((resolve) => {
        let last = 0;
        const po = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) last = e.startTime;
          resolve(last);
        });
        po.observe({ type: "largest-contentful-paint", buffered: true });
      });
    });
    const t0 = Date.now();
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(800);
    const lcp = await page.evaluate(() => window.__lcp);
    const nav = await page.evaluate(() => performance.getEntriesByType("navigation")[0]);
    samples.push({
      lcp: Math.round(lcp),
      ttfb: Math.round(nav?.responseStart ?? Date.now() - t0),
    });
    await context.close();
  }
  samples.sort((a, b) => a.lcp - b.lcp);
  return samples[Math.floor(RUNS / 2)];
}

const browser = await chromium.launch();

const anon = await measureLcp(browser, `${BASE}/sign-in`);

const login = await browser.newContext();
const res = await login.request.post(`${BASE}/api/auth/sign-in/email`, {
  data: { email: STUDENT_EMAIL, password: STUDENT_PASSWORD },
  headers: { Origin: BASE },
});
let dash = null;
if (res.status() === 200) {
  const cookies = await login.cookies();
  const sc = cookies.find((c) => c.name === "lms.session_token");
  dash = await measureLcp(browser, `${BASE}/dashboard`, {
    cookie: sc ? { name: sc.name, value: sc.value, domain: "localhost", path: "/" } : null,
  });
}
await login.close();
await browser.close();

console.log(`sign-in   (anon):       LCP=${anon.lcp}ms  TTFB=${anon.ttfb}ms`);
if (dash) console.log(`dashboard (${STUDENT_EMAIL}): LCP=${dash.lcp}ms  TTFB=${dash.ttfb}ms`);

const over = dash ? Math.max(anon.lcp, dash.lcp) : anon.lcp;
if (over > LCP_BUDGET_MS) {
  console.error(`FAIL: LCP ${over}ms exceeds budget ${LCP_BUDGET_MS}ms`);
  process.exit(1);
}
console.log(`OK: LCP within budget (${LCP_BUDGET_MS}ms)`);
process.exit(0);

import { seedBank } from "./seed-utils";

import { questions as cvs } from "./ospe/cvs-ospe";
import { questions as resp } from "./ospe/resp-ospe";
import { questions as renal } from "./ospe/renal-ospe";

const banks = [
  {
    moduleSlug: "cvs-202",
    bankSlug: "ospe-cvs",
    bankTitle: "OSPE CVS — Clinical Identification Stations",
    questions: cvs,
  },
  {
    moduleSlug: "rs-201",
    bankSlug: "ospe-resp",
    bankTitle: "OSPE Respiratory — Clinical Identification Stations",
    questions: resp,
  },
  {
    moduleSlug: "rau-203",
    bankSlug: "ospe-renal",
    bankTitle: "OSPE Renal — Clinical Identification Stations",
    questions: renal,
  },
];

async function main() {
  const overwrite = process.env.SEED_OVERWRITE === "1";

  console.log("[seed-ospe-mcq] Seeding OSPE question banks...\n");

  let ok = true;
  for (const b of banks) {
    const r = await seedBank({ ...b, overwrite });
    if (!r) ok = false;
  }

  const total = banks.reduce((sum, b) => sum + b.questions.length, 0);
  console.log(`\n[seed-ospe-mcq] Total: ${total} OSPE questions across ${banks.length} banks`);

  if (ok) {
    console.log("[seed-ospe-mcq] All banks seeded successfully.");
  } else {
    console.log("[seed-ospe-mcq] Some banks failed.");
  }

  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("[seed-ospe-mcq] error:", err);
  process.exit(1);
});

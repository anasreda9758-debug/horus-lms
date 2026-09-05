import "dotenv/config";
import postgres from "postgres";

const descriptions = {
  "ahe-101": "التشريح والأجنة والأنسجة — الترم الأول.",
  "ppg-102": "علم الأدوية والبيولوجيا الجزيئية ووظائف الأعضاء — الترم الأول.",
  "pmb-103": "علم الأمراض والأحياء الدقيقة والكيمياء الحيوية — الترم الأول.",
  "rs-201": "الجهاز التنفسي — الترم الثاني.",
  "cvs-202": "الجهاز القلبي الوعائي — الترم الثاني.",
  "rau-203": "الجهاز البولي — الترم الثاني.",
  "ibl-204": "المناعة والدم والجهاز اللمفاوي — الترم الثاني.",
};

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  for (const [slug, description] of Object.entries(descriptions)) {
    await sql`UPDATE module SET description = ${description}, updated_at = now() WHERE slug = ${slug}`;
  }
  console.log(`[module-descriptions] repaired=${Object.keys(descriptions).length}`);
} finally {
  await sql.end();
}

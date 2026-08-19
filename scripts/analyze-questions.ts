import postgres from "postgres";

const sql = postgres("postgres://postgres:lms_dev@localhost:5432/lms", { max: 5 });

async function main() {
  const banks = await sql`
    SELECT qb.id, qb.title, qb.slug, m.name as module_name, m.slug as module_slug,
    (SELECT count(*)::int FROM question q WHERE q.bank_id = qb.id) as q_count
    FROM question_bank qb
    JOIN module m ON m.id = qb.module_id
    ORDER BY m.slug, qb.title
  `;
  console.log("=== BANKS ===");
  for (const b of banks) console.log(`${b.module_slug} | ${b.title} | ${b.q_count}`);

  for (const b of banks) {
    const qs = await sql`
      SELECT q.prompt, q.explanation, q.difficulty,
      (SELECT json_agg(json_build_object('t', o.text, 'c', o.is_correct) ORDER BY o."order")
       FROM question_option o WHERE o.question_id = q.id) as opts
      FROM question q WHERE q.bank_id = ${b.id} ORDER BY q."order" LIMIT 3
    `;
    console.log(`\n--- ${b.module_slug} / ${b.title} (${b.q_count}Q) ---`);
    for (const q of qs) {
      console.log(`[${q.difficulty || "medium"}] ${q.prompt.slice(0, 300)}`);
      if (q.opts) for (const o of q.opts) console.log(`  ${o.c ? "✓" : "✗"} ${o.t.slice(0, 150)}`);
      if (q.explanation) console.log(`  → ${q.explanation.slice(0, 250)}`);
    }
  }
  await sql.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });

import postgres from "postgres";
const sql = postgres("postgres://postgres:lms_dev@localhost:5432/lms");
const t = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'question_bookmark'`;
console.log("question_bookmark exists:", t.length > 0);
const c = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='question_bank' AND column_name='lecture_id'`;
console.log("qb.lecture_id:", c.length > 0);
await sql.end();

// Dev-only embedded PostgreSQL 18 (binaries ship inside the npm package).
// Usage:  npm run db:dev        (start; keeps this terminal open)
//         npm run db:stop
//         npm run db:status
//
// NOTE: start uses the embedded-postgres spawn path (direct child of node),
// which stays healthy under the agent harness. pg_ctl-detached servers on this
// machine fail to spawn child backends (0xC0000142). stop/status use pg_ctl.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createConnection } from "node:net";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";

const root = process.cwd();
const DB_DIR = join(root, ".pgdata");
const PORT = 5432;
const USER = "postgres";
const PASSWORD = "lms_dev";
const DATABASE = "lms";
const BIN = join(
  root,
  "node_modules",
  "@embedded-postgres",
  "windows-x64",
  "native",
  "bin",
);

const pg = new EmbeddedPostgres({
  databaseDir: DB_DIR,
  port: PORT,
  user: USER,
  password: PASSWORD,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
});

function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const sock = createConnection({ port, host, timeout: 1000 });
    sock.once("connect", () => {
      sock.destroy();
      resolve(true);
    });
    sock.once("error", () => resolve(false));
    sock.once("timeout", () => {
      sock.destroy();
      resolve(false);
    });
  });
}

async function ensureDatabase() {
  const sql = postgres(`postgres://${USER}:${PASSWORD}@127.0.0.1:${PORT}/postgres`, {
    connect_timeout: 5,
    idle_timeout: 5,
  });
  try {
    const rows = await sql`SELECT 1 FROM pg_database WHERE datname = ${DATABASE}`;
    if (rows.length === 0) {
      await sql.unsafe(`CREATE DATABASE "${DATABASE}"`);
      console.log(`[dev-db] database '${DATABASE}' created`);
    }
  } finally {
    await sql.end();
  }
}

const action = process.argv[2] ?? "start";

try {
  if (action === "start") {
    const running = await isPortOpen(PORT);
    if (!running) {
      if (!existsSync(join(DB_DIR, "PG_VERSION"))) await pg.initialise();
      await pg.start();
      console.log("[dev-db] postgres started");
    } else {
      console.log("[dev-db] postgres is already running");
    }
    await ensureDatabase();
    console.log(`[dev-db] postgres 18 ready on 127.0.0.1:${PORT}/${DATABASE}`);
    console.log("[dev-db] keep this terminal open; stop with `npm run db:stop`");
    setInterval(() => {}, 1000);
  } else if (action === "stop") {
    const pgCtl = join(BIN, "pg_ctl.exe");
    const running = await isPortOpen(PORT);
    if (running) {
      spawnSync(pgCtl, ["-D", DB_DIR, "stop", "-m", "fast"], { stdio: "inherit" });
      console.log("[dev-db] postgres stopped");
    } else {
      console.log("[dev-db] postgres is not running");
    }
  } else if (action === "status") {
    const running = await isPortOpen(PORT);
    console.log(running ? "[dev-db] postgres is running" : "[dev-db] postgres is not running");
    process.exit(running ? 0 : 1);
  } else {
    console.error(`[dev-db] unknown action '${action}' (use start|stop|status)`);
    process.exit(1);
  }
} catch (err) {
  console.error("[dev-db] error:", err);
  process.exit(1);
}

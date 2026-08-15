// Dev-only embedded PostgreSQL 18 (binaries ship inside the npm package).
// Usage:  npm run db:dev        (start)
//         npm run db:stop
//         npm run db:status
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const root = process.cwd();
const DB_DIR = join(root, ".pgdata");
const BIN = join(
  root,
  "node_modules",
  "@embedded-postgres",
  "windows-x64",
  "native",
  "bin",
);
const PORT = "5432";
const USER = "postgres";
const PASSWORD = "lms_dev";
const DATABASE = "lms";
const LOG_FILE = join(DB_DIR, "postgres.log");

const bin = (name) => join(BIN, `${name}.exe`);

function ensureCluster() {
  if (existsSync(join(DB_DIR, "PG_VERSION"))) return;
  mkdirSync(DB_DIR, { recursive: true });
  const pwfile = join(DB_DIR, ".pwfile");
  writeFileSync(pwfile, PASSWORD);
  spawnSync(
    bin("initdb"),
    ["-D", DB_DIR, "-U", USER, "-A", "scram-sha-256", "--pwfile", pwfile, "-E", "UTF8"],
    { stdio: "inherit" },
  );
  rmSync(pwfile, { force: true });
}

function isRunning() {
  return spawnSync(bin("pg_ctl"), ["-D", DB_DIR, "status"], { stdio: "pipe" }).status === 0;
}

async function ensureDatabase() {
  const sql = postgres(
    `postgres://${USER}:${PASSWORD}@127.0.0.1:${PORT}/postgres`,
    { connect_timeout: 5, idle_timeout: 5 },
  );
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
    if (!isRunning()) {
      ensureCluster();
      spawnSync(
        bin("pg_ctl"),
        ["-D", DB_DIR, "-l", LOG_FILE, "-o", "-p 5432 -h 127.0.0.1", "start"],
        { stdio: "inherit" },
      );
    } else {
      console.log("[dev-db] postgres is already running");
    }
    await ensureDatabase();
    console.log(`[dev-db] postgres 18 ready on localhost:${PORT}/${DATABASE}`);
  } else if (action === "stop") {
    if (isRunning()) {
      spawnSync(bin("pg_ctl"), ["-D", DB_DIR, "stop", "-m", "fast"], { stdio: "inherit" });
      console.log("[dev-db] postgres stopped");
    } else {
      console.log("[dev-db] postgres is not running");
    }
  } else if (action === "status") {
    const running = isRunning();
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

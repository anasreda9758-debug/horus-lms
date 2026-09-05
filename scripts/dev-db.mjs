// Dev-only embedded PostgreSQL 18 (binaries ship inside the npm package).
// Usage:  npm run db:dev        (start; keeps this terminal open)
//         npm run db:stop
//         npm run db:status
//
// NOTE: start uses the embedded-postgres spawn path (direct child of node),
// which stays healthy under the agent harness. pg_ctl-detached servers on this
// machine fail to spawn child backends (0xC0000142). stop/status use pg_ctl.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { createConnection } from "node:net";
import { join } from "node:path";
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

async function waitForDatabase(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const sql = postgres(`postgres://${USER}:${PASSWORD}@127.0.0.1:${PORT}/postgres`, {
      connect_timeout: 1,
      idle_timeout: 1,
      max: 1,
    });
    try {
      await sql.unsafe("SELECT 1");
      return true;
    } catch {
      // PostgreSQL can accept TCP connections while crash recovery is still running.
    } finally {
      await sql.end().catch(() => {});
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

function removeStalePidFile() {
  const pidFile = join(DB_DIR, "postmaster.pid");
  if (!existsSync(pidFile)) return;

  const pid = Number(readFileSync(pidFile, "utf8").split(/\r?\n/, 1)[0]);
  try {
    process.kill(pid, 0);
  } catch {
    unlinkSync(pidFile);
    console.log("[dev-db] removed stale PostgreSQL state file");
  }
}

async function startPostgres() {
  if (!existsSync(join(DB_DIR, "PG_VERSION"))) {
    throw new Error("database is not initialized; restore .pgdata before starting it");
  }

  removeStalePidFile();
  const postgresExe = join(BIN, "postgres.exe");
  const child = spawn(postgresExe, ["-D", DB_DIR, "-p", String(PORT), "-h", "127.0.0.1"], {
    stdio: "inherit",
    windowsHide: true,
  });
  child.once("error", (err) => console.error("[dev-db] postgres process error:", err));

  if (!(await waitForDatabase())) {
    throw new Error("PostgreSQL did not become ready within 30 seconds");
  }
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
      await startPostgres();
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

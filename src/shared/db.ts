import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required. Copy .env.example to .env and start the dev db (npm run db:dev).",
  );
}

const client = postgres(connectionString, { max: 10, prepare: false });

export const db = drizzle(client, { schema });
export { client };

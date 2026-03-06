import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString: env.databaseUrl
});

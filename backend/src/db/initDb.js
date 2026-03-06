import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, "../../sql/schema.sql");

async function initDb() {
  const schema = fs.readFileSync(schemaPath, "utf-8");
  await pool.query(schema);
  console.log("Database schema initialized");
  await pool.end();
}

initDb().catch(async (error) => {
  console.error("DB init failed", error);
  await pool.end();
  process.exit(1);
});

import { Pool } from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config({ quiet: true });

export const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || process.env.USER,
  password: process.env.PGPASSWORD || undefined,
  database: process.env.PGDATABASE || "crm",
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS names (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM names");
  if (rows[0].count === 0) {
    const seedNames = ["Alice", "Bob", "Charlie", "Diana", "Ethan"];
    await Promise.all(
      seedNames.map((name) => pool.query("INSERT INTO names (name) VALUES ($1)", [name]))
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const { rows: userRows } = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  if (userRows[0].count === 0) {
    const passwordHash = await bcrypt.hash("password123", 10);
    await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
      ["testuser", passwordHash]
    );
  }
}

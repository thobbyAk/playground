import express from "express";
import { pool, initDb } from "./db";
import { authRouter, requireAuth } from "./auth";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(authRouter);

app.get("/api/names", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name FROM names ORDER BY id ASC"
  );
  res.json({ names: rows });
});

app.post("/api/names", requireAuth, async (req, res) => {
  const { name } = req.body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "name is required" });
  }

  const { rows } = await pool.query(
    "INSERT INTO names (name) VALUES ($1) RETURNING id, name",
    [name.trim()]
  );
  res.status(201).json({ name: rows[0] });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });

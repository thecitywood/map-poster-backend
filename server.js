// server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(bodyParser.json());
app.use(cors());

// --- Database ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- Rate limit for login ---
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per windowMs
  message: { success: false, error: "Too many login attempts. Try again later." },
});

// --- Admin login ---
const ADMIN_PASS = process.env.ADMIN_PASS || "test123";

app.post("/api/admin/check", loginLimiter, (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASS) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Wrong password" });
  }
});

// --- Generic CRUD helper ---
function makeCrudRoutes(table, idField = "id") {
  // Get all
  app.get(`/api/${table}`, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY ${idField}`);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Insert
  app.post(`/api/${table}`, async (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const values = Object.values(req.body);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");
      const query = `INSERT INTO ${table} (${keys.join(",")}) VALUES (${placeholders}) RETURNING *`;
      const { rows } = await pool.query(query, values);
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update
  app.put(`/api/${table}/:${idField}`, async (req, res) => {
    try {
      const id = req.params[idField];
      const keys = Object.keys(req.body);
      const values = Object.values(req.body);
      const set = keys.map((k, i) => `${k}=$${i + 1}`).join(",");
      const query = `UPDATE ${table} SET ${set} WHERE ${idField}=$${keys.length + 1} RETURNING *`;
      const { rows } = await pool.query(query, [...values, id]);
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete
  app.delete(`/api/${table}/:${idField}`, async (req, res) => {
    try {
      const id = req.params[idField];
      await pool.query(`DELETE FROM ${table} WHERE ${idField}=$1`, [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// --- Register routes ---
makeCrudRoutes("products");
makeCrudRoutes("formats");
makeCrudRoutes("styles");
makeCrudRoutes("frame_colors");
makeCrudRoutes("pin_shapes");
makeCrudRoutes("pin_colors");

// --- Server start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

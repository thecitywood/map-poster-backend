const express = require("express");
const { Pool } = require("pg");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Połączenie z Neon DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Tworzenie tabeli orders przy starcie
async function initDB() {
  const query = `
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      shopify_order_id TEXT,
      ip_address TEXT,
      email TEXT,
      map_center_lat DOUBLE PRECISION,
      map_center_lng DOUBLE PRECISION,
      map_style TEXT,
      map_size TEXT,
      front_text TEXT,
      back_text TEXT,
      pins JSONB,
      generated BOOLEAN DEFAULT false,
      upload_status TEXT DEFAULT 'pending',
      preview_token TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
  await pool.query(query);
  console.log("✅ Tabela orders gotowa");
}
initDB();

// Endpoint testowy
app.get("/", (req, res) => {
  res.send("✅ Backend działa i jest połączony z Neon DB!");
});

// Dodanie zamówienia
app.post("/api/order", async (req, res) => {
  try {
    const {
      shopify_order_id,
      ip_address,
      email,
      map_center_lat,
      map_center_lng,
      map_style,
      map_size,
      front_text,
      back_text,
      pins
    } = req.body;

    const preview_token = crypto.randomBytes(16).toString("hex");

    const result = await pool.query(
      `INSERT INTO orders
      (shopify_order_id, ip_address, email, map_center_lat, map_center_lng, map_style, map_size, front_text, back_text, pins, preview_token)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        shopify_order_id,
        ip_address,
        email,
        map_center_lat,
        map_center_lng,
        map_style,
        map_size,
        front_text,
        back_text,
        pins ? JSON.stringify(pins) : null,
        preview_token
      ]
    );

    res.json({
      message: "✅ Zamówienie zapisane",
      order: result.rows[0],
      preview_link: `https://map-poster-backend-e5f9.onrender.com/preview/${preview_token}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Błąd przy dodawaniu zamówienia" });
  }
});

// Lista zamówień
app.get("/api/orders", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Błąd przy pobieraniu zamówień" });
  }
});

// Start serwera
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

const express = require("express");
const { Pool } = require("pg");
const crypto = require("crypto");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware JSON
app.use(express.json());

// Middleware CORS – manual headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Google Sheets setup
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Authenticate with service account
const auth = new google.auth.GoogleAuth({
  keyFile: "/etc/secrets/google-service-account.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

async function appendToSheet(order) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const values = [[
      order.id,
      order.shopify_order_id,
      order.email,
      order.map_style,
      order.map_size,
      order.front_text || "",
      order.back_text || "",
      JSON.stringify(order.pins),
      `https://map-poster-backend-e5f9.onrender.com/preview/${order.preview_token}`,
      order.created_at
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Orders!A:J",
      valueInputOption: "RAW",
      requestBody: { values }
    });

    console.log("✅ Order exported to Google Sheets");
  } catch (err) {
    console.error("❌ Error exporting to Google Sheets:", err);
  }
}

// Create orders table on startup
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
  console.log("✅ Orders table ready");
}
initDB();

// Test endpoint
app.get("/", (req, res) => {
  res.send("✅ Backend is running and connected to Neon DB + Google Sheets!");
});

// Add order
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

    const order = result.rows[0];

    // Export to Google Sheets
    appendToSheet(order);

    res.json({
      message: "✅ Order saved",
      order,
      preview_link: `https://map-poster-backend-e5f9.onrender.com/preview/${preview_token}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Error while saving order" });
  }
});

// Orders list
app.get("/api/orders", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Error while fetching orders" });
  }
});

// Preview order by token
app.get("/preview/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      "SELECT * FROM orders WHERE preview_token = $1",
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("❌ Order not found");
    }

    const order = result.rows[0];

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Order Preview #${order.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .map { width: 400px; height: 300px; background: #eee; border: 1px solid #ccc; }
          pre { background: #f8f8f8; padding: 10px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <h1>Order Preview</h1>
        <p><strong>Email:</strong> ${order.email}</p>
        <p><strong>Map:</strong> style=${order.map_style}, size=${order.map_size}</p>
        <p><strong>Front text:</strong> ${order.front_text || "-"}</p>
        <p><strong>Back text:</strong> ${order.back_text || "-"}</p>
        <h2>Pins</h2>
        <pre>${JSON.stringify(order.pins, null, 2)}</pre>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error while generating preview");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

const express = require("express");
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts, try again later." }
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20
});

// Middleware: admin auth
function adminAuth(req, res, next) {
  const auth = req.headers["authorization"];
  if (!auth) return res.status(403).json({ error: "Missing auth" });
  const token = auth.replace("Bearer ", "");
  if (token !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: "Invalid password" });
  }
  next();
}

// DB init
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_types (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT true
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS poster_formats (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES product_types(id) ON DELETE CASCADE,
      size_cm TEXT,
      size_in TEXT,
      base_price NUMERIC,
      discount_type TEXT DEFAULT 'none',
      discount_value NUMERIC DEFAULT 0,
      active BOOLEAN DEFAULT true
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      shopify_order_id TEXT,
      ip_address TEXT,
      email TEXT,
      map_center_lat NUMERIC,
      map_center_lng NUMERIC,
      map_style TEXT,
      map_size TEXT,
      front_text TEXT,
      back_text TEXT,
      pins JSONB,
      generated BOOLEAN DEFAULT false,
      upload_status TEXT DEFAULT 'pending',
      preview_token TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("✅ Tables ready");
}
initDB();

// Health check
app.get("/healthz", (req, res) => res.send("OK"));

// Admin check
app.get("/api/admin/check", loginLimiter, adminAuth, (req, res) => {
  res.json({ success: true });
});

// Get products + formats
app.get("/api/products", async (req, res) => {
  try {
    const products = await pool.query("SELECT * FROM product_types ORDER BY id");
    const formats = await pool.query("SELECT * FROM poster_formats ORDER BY id");
    const data = products.rows.map(p => ({
      ...p,
      formats: formats.rows.filter(f => f.product_id === p.id)
    }));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load products" });
  }
});

// Update product
app.put("/api/admin/products/:id", adminLimiter, adminAuth, async (req, res) => {
  try {
    const { name, description, active } = req.body;
    await pool.query("UPDATE product_types SET name=$1, description=$2, active=$3 WHERE id=$4",
      [name, description, active, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// Update format
app.put("/api/admin/formats/:id", adminLimiter, adminAuth, async (req, res) => {
  try {
    const { size_cm, size_in, base_price, discount_type, discount_value, active } = req.body;
    await pool.query(
      "UPDATE poster_formats SET size_cm=$1, size_in=$2, base_price=$3, discount_type=$4, discount_value=$5, active=$6 WHERE id=$7",
      [size_cm, size_in, base_price, discount_type, discount_value, active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update format" });
  }
});

// DELETE product + formats
app.delete("/api/admin/products/:id", adminLimiter, adminAuth, async (req, res) => {
  try {
    const productId = req.params.id;
    await pool.query("DELETE FROM poster_formats WHERE product_id=$1", [productId]);
    await pool.query("DELETE FROM product_types WHERE id=$1", [productId]);
    res.json({ success: true, message: "Product and its formats deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// DELETE format
app.delete("/api/admin/formats/:id", adminLimiter, adminAuth, async (req, res) => {
  try {
    const formatId = req.params.id;
    await pool.query("DELETE FROM poster_formats WHERE id=$1", [formatId]);
    res.json({ success: true, message: "Format deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete format" });
  }
});

// Orders endpoints (simplified)
app.post("/api/order", async (req, res) => {
  try {
    const {
      shopify_order_id, ip_address, email,
      map_center_lat, map_center_lng, map_style, map_size,
      front_text, back_text, pins
    } = req.body;
    const preview_token = crypto.randomBytes(16).toString("hex");
    const result = await pool.query(
      `INSERT INTO orders
      (shopify_order_id, ip_address, email, map_center_lat, map_center_lng, map_style, map_size, front_text, back_text, pins, preview_token)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [shopify_order_id, ip_address, email, map_center_lat, map_center_lng, map_style, map_size, front_text, back_text, JSON.stringify(pins), preview_token]
    );
    const order = result.rows[0];
    res.json({
      message: "✅ Order saved",
      order,
      preview_link: `https://map-poster-backend-e5f9.onrender.com/preview/${order.preview_token}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders ORDER BY id DESC LIMIT 50");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// Preview endpoint
app.get("/preview/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const result = await pool.query("SELECT * FROM orders WHERE preview_token=$1", [token]);
    if (result.rows.length === 0) {
      return res.status(404).send("❌ Invalid or expired preview token");
    }
    res.send(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Your Poster Preview</title></head>
      <body style="font-family:sans-serif;max-width:900px;margin:auto;text-align:center;">
        <h1>Your Poster Preview</h1>
        <p>🖼️ Preview for order token: ${token}</p>
        <script>
          setTimeout(()=>{ document.body.innerHTML += '<p>(Map rendering placeholder)</p>'; },2000);
        </script>
      </body></html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Server running on port " + PORT));

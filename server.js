// server.js (ESM)

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import pg from "pg";

dotenv.config();
const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

/** Połączenie do Neon */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/** Helper: zamiana undefined -> null */
const n = (v) => (v === undefined ? null : v);

/** Healthcheck */
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Login (prosty) */
app.post("/api/admin/check", (req, res) => {
  const ok =
    String(req.body?.password || "") ===
    String(process.env.ADMIN_PASSWORD || "");
  if (ok) return res.json({ success: true });
  return res.status(401).json({ success: false, message: "Wrong password" });
});

/* ============================================================
   PRODUCTS
============================================================ */
app.get("/api/products", async (_req, res) => {
  const q = `SELECT * FROM products ORDER BY sort_order NULLS LAST, id ASC`;
  const r = await pool.query(q);
  res.json(r.rows);
});

app.get("/api/products/:id", async (req, res) => {
  const r = await pool.query(`SELECT * FROM products WHERE id=$1`, [
    req.params.id,
  ]);
  if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
  res.json(r.rows[0]);
});

app.post("/api/products", async (req, res) => {
  const b = req.body || {};
  const q = `
    INSERT INTO products
    (name, description, active,
     allow_left, allow_center, allow_right, allow_back, allow_pins, allow_gift, allow_frames, allow_top,
     sort_order, orientation, width_px, height_px)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING *`;
  const vals = [
    n(b.name),
    n(b.description),
    b.active ? 1 : 0,
    b.allow_left ? 1 : 0,
    b.allow_center ? 1 : 0,
    b.allow_right ? 1 : 0,
    b.allow_back ? 1 : 0,
    b.allow_pins ? 1 : 0,
    b.allow_gift ? 1 : 0,
    b.allow_frames ? 1 : 0,
    b.allow_top ? 1 : 0,
    n(b.sort_order),
    n(b.orientation),
    n(b.width_px),
    n(b.height_px),
  ];
  const r = await pool.query(q, vals);
  res.status(201).json(r.rows[0]);
});

app.put("/api/products/:id", async (req, res) => {
  const b = req.body || {};
  const q = `
    UPDATE products SET
      name=$1, description=$2, active=$3,
      allow_left=$4, allow_center=$5, allow_right=$6, allow_back=$7, allow_pins=$8, allow_gift=$9, allow_frames=$10, allow_top=$11,
      sort_order=$12, orientation=$13, width_px=$14, height_px=$15
    WHERE id=$16
    RETURNING *`;
  const vals = [
    n(b.name),
    n(b.description),
    b.active ? 1 : 0,
    b.allow_left ? 1 : 0,
    b.allow_center ? 1 : 0,
    b.allow_right ? 1 : 0,
    b.allow_back ? 1 : 0,
    b.allow_pins ? 1 : 0,
    b.allow_gift ? 1 : 0,
    b.allow_frames ? 1 : 0,
    b.allow_top ? 1 : 0,
    n(b.sort_order),
    n(b.orientation),
    n(b.width_px),
    n(b.height_px),
    req.params.id,
  ];
  const r = await pool.query(q, vals);
  if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
  res.json(r.rows[0]);
});

app.delete("/api/products/:id", async (req, res) => {
  await pool.query(`DELETE FROM products WHERE id=$1`, [req.params.id]);
  res.json({ success: true });
});

/* ============================================================
   FORMATS (per product)
============================================================ */
app.get("/api/products/:productId/formats", async (req, res) => {
  const r = await pool.query(
    `SELECT * FROM formats WHERE product_id=$1
     ORDER BY sort_order NULLS LAST, id ASC`,
    [req.params.productId]
  );
  res.json(r.rows);
});

app.post("/api/products/:productId/formats", async (req, res) => {
  const b = req.body || {};
  const q = `
    INSERT INTO formats
    (product_id, cm_size, in_size, orientation, px_width, px_height, price, discount_type, discount_value, active, sort_order)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *`;
  const vals = [
    req.params.productId,
    n(b.cm_size),
    n(b.in_size),
    n(b.orientation),
    n(b.px_width),
    n(b.px_height),
    n(b.price),
    n(b.discount_type),
    n(b.discount_value),
    b.active ? 1 : 0,
    n(b.sort_order),
  ];
  const r = await pool.query(q, vals);
  res.status(201).json(r.rows[0]);
});

app.put("/api/formats/:id", async (req, res) => {
  const b = req.body || {};
  const q = `
    UPDATE formats SET
      cm_size=$1, in_size=$2, orientation=$3, px_width=$4, px_height=$5,
      price=$6, discount_type=$7, discount_value=$8, active=$9, sort_order=$10
    WHERE id=$11
    RETURNING *`;
  const vals = [
    n(b.cm_size),
    n(b.in_size),
    n(b.orientation),
    n(b.px_width),
    n(b.px_height),
    n(b.price),
    n(b.discount_type),
    n(b.discount_value),
    b.active ? 1 : 0,
    n(b.sort_order),
    req.params.id,
  ];
  const r = await pool.query(q, vals);
  if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
  res.json(r.rows[0]);
});

app.delete("/api/formats/:id", async (req, res) => {
  await pool.query(`DELETE FROM formats WHERE id=$1`, [req.params.id]);
  res.json({ success: true });
});

/* ============================================================
   STYLES (per product)
============================================================ */
app.get("/api/products/:productId/styles", async (req, res) => {
  const r = await pool.query(
    `SELECT * FROM styles WHERE product_id=$1
     ORDER BY sort_order NULLS LAST, id ASC`,
    [req.params.productId]
  );
  res.json(r.rows);
});

app.post("/api/products/:productId/styles", async (req, res) => {
  const b = req.body || {};
  const q = `
    INSERT INTO styles (product_id, name, active, preview_url, sort_order)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *`;
  const vals = [
    req.params.productId,
    n(b.name),
    b.active ? 1 : 0,
    n(b.preview_url),
    n(b.sort_order),
  ];
  const r = await pool.query(q, vals);
  res.status(201).json(r.rows[0]);
});

app.put("/api/styles/:id", async (req, res) => {
  const b = req.body || {};
  const q = `
    UPDATE styles SET name=$1, active=$2, preview_url=$3, sort_order=$4
    WHERE id=$5
    RETURNING *`;
  const vals = [
    n(b.name),
    b.active ? 1 : 0,
    n(b.preview_url),
    n(b.sort_order),
    req.params.id,
  ];
  const r = await pool.query(q, vals);
  if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
  res.json(r.rows[0]);
});

app.delete("/api/styles/:id", async (req, res) => {
  await pool.query(`DELETE FROM styles WHERE id=$1`, [req.params.id]);
  res.json({ success: true });
});

/* ============================================================
   FRAME COLORS
============================================================ */
app.get("/api/frame-colors", async (_req, res) => {
  const r = await pool.query(
    `SELECT * FROM frame_colors ORDER BY sort_order NULLS LAST, id ASC`
  );
  res.json(r.rows);
});

app.post("/api/frame-colors", async (req, res) => {
  const b = req.body || {};
  const r = await pool.query(
    `INSERT INTO frame_colors (name, active, thumbnail_url, asset_url, sort_order)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [n(b.name), b.active ? 1 : 0, n(b.thumbnail_url), n(b.asset_url), n(b.sort_order)]
  );
  res.status(201).json(r.rows[0]);
});

app.put("/api/frame-colors/:id", async (req, res) => {
  const b = req.body || {};
  const r = await pool.query(
    `UPDATE frame_colors SET
       name=$1, active=$2, thumbnail_url=$3, asset_url=$4, sort_order=$5
     WHERE id=$6 RETURNING *`,
    [n(b.name), b.active ? 1 : 0, n(b.thumbnail_url), n(b.asset_url), n(b.sort_order), req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
  res.json(r.rows[0]);
});

app.delete("/api/frame-colors/:id", async (req, res) => {
  await pool.query(`DELETE FROM frame_colors WHERE id=$1`, [req.params.id]);
  res.json({ success: true });
});

/* ============================================================
   PIN SHAPES
============================================================ */
app.get("/api/pin-shapes", async (_req, res) => {
  const r = await pool.query(
    `SELECT * FROM pin_shapes ORDER BY sort_order NULLS LAST, id ASC`
  );
  res.json(r.rows);
});

app.post("/api/pin-shapes", async (req, res) => {
  const b = req.body || {};
  const r = await pool.query(
    `INSERT INTO pin_shapes (name, active, icon_url, sort_order)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [n(b.name), b.active ? 1 : 0, n(b.icon_url), n(b.sort_order)]
  );
  res.status(201).json(r.rows[0]);
});

app.put("/api/pin-shapes/:id", async (req, res) => {
  const b = req.body || {};
  const r = await pool.query(
    `UPDATE pin_shapes SET
       name=$1, active=$2, icon_url=$3, sort_order=$4
     WHERE id=$5 RETURNING *`,
    [n(b.name), b.active ? 1 : 0, n(b.icon_url), n(b.sort_order), req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
  res.json(r.rows[0]);
});

app.delete("/api/pin-shapes/:id", async (req, res) => {
  await pool.query(`DELETE FROM pin_shapes WHERE id=$1`, [req.params.id]);
  res.json({ success: true });
});

/* ============================================================
   PIN COLORS
============================================================ */
app.get("/api/pin-colors", async (_req, res) => {
  const r = await pool.query(
    `SELECT * FROM pin_colors ORDER BY sort_order NULLS LAST, id ASC`
  );
  res.json(r.rows);
});

app.post("/api/pin-colors", async (req, res) => {
  const b = req.body || {};
  const r = await pool.query(
    `INSERT INTO pin_colors (name, hex, active, sort_order)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [n(b.name), n(b.hex), b.active ? 1 : 0, n(b.sort_order)]
  );
  res.status(201).json(r.rows[0]);
});

app.put("/api/pin-colors/:id", async (req, res) => {
  const b = req.body || {};
  const r = await pool.query(
    `UPDATE pin_colors SET
       name=$1, hex=$2, active=$3, sort_order=$4
     WHERE id=$5 RETURNING *`,
    [n(b.name), n(b.hex), b.active ? 1 : 0, n(b.sort_order), req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ message: "Not found" });
  res.json(r.rows[0]);
});

app.delete("/api/pin-colors/:id", async (req, res) => {
  await pool.query(`DELETE FROM pin_colors WHERE id=$1`, [req.params.id]);
  res.json({ success: true });
});

/* ============================================================
   Start
============================================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Control Room API running on :${PORT}`);
});

import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 5000;

// Połączenie z Neon (Postgres)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render -> Environment -> DATABASE_URL
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// --- Healthcheck (prosty test czy backend żyje) ---
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "unknown" });
});

// --- Logowanie admina (Control Room oczekuje tego endpointu) ---
// Ustaw w Render zmienną środowiskową: ADMIN_PASS
app.post("/api/admin/check", (req, res) => {
  const { password } = req.body || {};
  const ok = Boolean(password) &&
             Boolean(process.env.ADMIN_PASS) &&
             password === process.env.ADMIN_PASS;

  if (ok) return res.json({ success: true });
  return res.status(401).json({ success: false, error: "Invalid password" });
});


/* ======================
   ✅ ROUTES
====================== */

// test – sprawdzamy czy działa
app.get("/", (req, res) => {
  res.send("✅ Backend is running with PostgreSQL (Neon)");
});

// pobierz wszystkie produkty
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY sort_order ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// dodaj nowy produkt
app.post("/api/products", async (req, res) => {
  try {
    const {
      name,
      description,
      active,
      allow_left,
      allow_center,
      allow_right,
      allow_back,
      allow_pins,
      allow_gift,
      allow_frames,
      allow_top,
      orientation,
      width_px,
      height_px,
      sort_order
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products 
      (name, description, active, allow_left, allow_center, allow_right, allow_back, allow_pins, allow_gift, allow_frames, allow_top, orientation, width_px, height_px, sort_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [name, description, active, allow_left, allow_center, allow_right, allow_back, allow_pins, allow_gift, allow_frames, allow_top, orientation, width_px, height_px, sort_order]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error inserting product:", err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

// aktualizuj produkt
app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      active,
      allow_left,
      allow_center,
      allow_right,
      allow_back,
      allow_pins,
      allow_gift,
      allow_frames,
      allow_top,
      orientation,
      width_px,
      height_px,
      sort_order
    } = req.body;

    const result = await pool.query(
      `UPDATE products SET
      name=$1, description=$2, active=$3, allow_left=$4, allow_center=$5, allow_right=$6, 
      allow_back=$7, allow_pins=$8, allow_gift=$9, allow_frames=$10, allow_top=$11, 
      orientation=$12, width_px=$13, height_px=$14, sort_order=$15
      WHERE id=$16 RETURNING *`,
      [name, description, active, allow_left, allow_center, allow_right, allow_back, allow_pins, allow_gift, allow_frames, allow_top, orientation, width_px, height_px, sort_order, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// usuń produkt
app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM products WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

/* ======================
   ✅ START SERVER
====================== */

/* ======================
   FORMATS
====================== */
app.get("/api/formats", async (_req, res) => {
  const r = await pool.query(
    "SELECT * FROM formats ORDER BY sort_order NULLS LAST, id ASC"
  );
  res.json(r.rows);
});
app.post("/api/formats", async (req, res) => {
  const { name, active, width_mm, height_mm, dpi, base_price_cents, sort_order } = req.body;
  const r = await pool.query(
    `INSERT INTO formats (name, active, width_mm, height_mm, dpi, base_price_cents, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, active, width_mm, height_mm, dpi, base_price_cents, sort_order]
  );
  res.status(201).json(r.rows[0]);
});
app.put("/api/formats/:id", async (req, res) => {
  const { id } = req.params;
  const { name, active, width_mm, height_mm, dpi, base_price_cents, sort_order } = req.body;
  const r = await pool.query(
    `UPDATE formats SET name=$1, active=$2, width_mm=$3, height_mm=$4, dpi=$5, base_price_cents=$6, sort_order=$7
     WHERE id=$8 RETURNING *`,
    [name, active, width_mm, height_mm, dpi, base_price_cents, sort_order, id]
  );
  res.json(r.rows[0]);
});
app.delete("/api/formats/:id", async (req, res) => {
  await pool.query("DELETE FROM formats WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

/* ======================
   STYLES
====================== */
app.get("/api/styles", async (_req, res) => {
  const r = await pool.query(
    "SELECT * FROM styles ORDER BY sort_order NULLS LAST, id ASC"
  );
  res.json(r.rows);
});
app.post("/api/styles", async (req, res) => {
  const { name, active, icon_url, sort_order } = req.body;
  const r = await pool.query(
    `INSERT INTO styles (name, active, icon_url, sort_order)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, active, icon_url, sort_order]
  );
  res.status(201).json(r.rows[0]);
});
app.put("/api/styles/:id", async (req, res) => {
  const { id } = req.params;
  const { name, active, icon_url, sort_order } = req.body;
  const r = await pool.query(
    `UPDATE styles SET name=$1, active=$2, icon_url=$3, sort_order=$4 WHERE id=$5 RETURNING *`,
    [name, active, icon_url, sort_order, id]
  );
  res.json(r.rows[0]);
});
app.delete("/api/styles/:id", async (req, res) => {
  await pool.query("DELETE FROM styles WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

/* ======================
   FRAME COLORS
====================== */
app.get("/api/frame-colors", async (_req, res) => {
  const r = await pool.query(
    "SELECT * FROM frame_colors ORDER BY sort_order NULLS LAST, id ASC"
  );
  res.json(r.rows);
});
app.post("/api/frame-colors", async (req, res) => {
  const { name, active, thumbnail_url, asset_url, sort_order } = req.body;
  const r = await pool.query(
    `INSERT INTO frame_colors (name, active, thumbnail_url, asset_url, sort_order)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [name, active, thumbnail_url, asset_url, sort_order]
  );
  res.status(201).json(r.rows[0]);
});
app.put("/api/frame-colors/:id", async (req, res) => {
  const { id } = req.params;
  const { name, active, thumbnail_url, asset_url, sort_order } = req.body;
  const r = await pool.query(
    `UPDATE frame_colors SET name=$1, active=$2, thumbnail_url=$3, asset_url=$4, sort_order=$5
     WHERE id=$6 RETURNING *`,
    [name, active, thumbnail_url, asset_url, sort_order, id]
  );
  res.json(r.rows[0]);
});
app.delete("/api/frame-colors/:id", async (req, res) => {
  await pool.query("DELETE FROM frame_colors WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

/* ======================
   PIN SHAPES
====================== */
app.get("/api/pin-shapes", async (_req, res) => {
  const r = await pool.query(
    "SELECT * FROM pin_shapes ORDER BY sort_order NULLS LAST, id ASC"
  );
  res.json(r.rows);
});
app.post("/api/pin-shapes", async (req, res) => {
  const { name, active, icon_url, sort_order } = req.body;
  const r = await pool.query(
    `INSERT INTO pin_shapes (name, active, icon_url, sort_order)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, active, icon_url, sort_order]
  );
  res.status(201).json(r.rows[0]);
});
app.put("/api/pin-shapes/:id", async (req, res) => {
  const { id } = req.params;
  const { name, active, icon_url, sort_order } = req.body;
  const r = await pool.query(
    `UPDATE pin_shapes SET name=$1, active=$2, icon_url=$3, sort_order=$4 WHERE id=$5 RETURNING *`,
    [name, active, icon_url, sort_order, id]
  );
  res.json(r.rows[0]);
});
app.delete("/api/pin-shapes/:id", async (req, res) => {
  await pool.query("DELETE FROM pin_shapes WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

/* ======================
   PIN COLORS
====================== */
app.get("/api/pin-colors", async (_req, res) => {
  const r = await pool.query(
    "SELECT * FROM pin_colors ORDER BY sort_order NULLS LAST, id ASC"
  );
  res.json(r.rows);
});
app.post("/api/pin-colors", async (req, res) => {
  const { name, hex, active, sort_order } = req.body;
  const r = await pool.query(
    `INSERT INTO pin_colors (name, hex, active, sort_order)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, hex, active, sort_order]
  );
  res.status(201).json(r.rows[0]);
});
app.put("/api/pin-colors/:id", async (req, res) => {
  const { id } = req.params;
  const { name, hex, active, sort_order } = req.body;
  const r = await pool.query(
    `UPDATE pin_colors SET name=$1, hex=$2, active=$3, sort_order=$4 WHERE id=$5 RETURNING *`,
    [name, hex, active, sort_order, id]
  );
  res.json(r.rows[0]);
});
app.delete("/api/pin-colors/:id", async (req, res) => {
  await pool.query("DELETE FROM pin_colors WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

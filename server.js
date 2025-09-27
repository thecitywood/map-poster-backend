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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

// Postgres connection (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(cors());
app.use(bodyParser.json());

/* =============================
   PRODUCTS
============================= */

// Get all products
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY sort_order ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Add product
app.post("/api/products", async (req, res) => {
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
    sort_order,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO products 
      (name, description, active, allow_left, allow_center, allow_right, allow_back, allow_pins, allow_gift, allow_frames, allow_top, sort_order) 
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
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
        sort_order,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Update product
app.put("/api/products/:id", async (req, res) => {
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
    sort_order,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE products 
       SET name=$1, description=$2, active=$3, allow_left=$4, allow_center=$5, allow_right=$6, allow_back=$7, 
           allow_pins=$8, allow_gift=$9, allow_frames=$10, allow_top=$11, sort_order=$12
       WHERE id=$13 RETURNING *`,
      [
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
        sort_order,
        id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Delete product
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM products WHERE id=$1", [id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* =============================
   SERVER START
============================= */
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});

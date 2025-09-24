const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Proste logowanie
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';

app.post('/api/admin/check', (req,res) => {
  if (req.body.password === ADMIN_PASS) res.sendStatus(200);
  else res.sendStatus(401);
});

// Helper do prostych zapytań
async function replaceTable(table, cols, rows) {
  await pool.query(`DELETE FROM ${table}`);
  for (const r of rows) {
    const fields = cols.map(c => r[c]);
    const placeholders = cols.map((_,i) => `$${i+1}`).join(",");
    await pool.query(
      `INSERT INTO ${table}(${cols.join(",")}) VALUES (${placeholders})`,
      fields
    );
  }
}

// PRODUCTS
app.get('/api/admin/products', async (req,res) => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY sort_order');
  res.json(rows);
});
app.post('/api/admin/save-products', async (req,res) => {
  await replaceTable("products", ["name","description","active","sort_order"], req.body);
  res.json({status:"ok"});
});

// FORMATS
app.get('/api/admin/formats', async (req,res) => {
  const { rows } = await pool.query('SELECT * FROM formats ORDER BY sort_order');
  res.json(rows);
});
app.post('/api/admin/save-formats', async (req,res) => {
  await replaceTable("formats", ["product_id","width_cm","height_cm","width_in","height_in","base_price","discount_type","discount_value","active","sort_order"], req.body);
  res.json({status:"ok"});
});

// FRAME COLORS
app.get('/api/admin/frame-colors', async (req,res) => {
  const { rows } = await pool.query('SELECT * FROM frame_colors ORDER BY sort_order');
  res.json(rows);
});
app.post('/api/admin/save-frame-colors', async (req,res) => {
  await replaceTable("frame_colors", ["name","thumbnail_url","asset_url","active","sort_order"], req.body);
  res.json({status:"ok"});
});

// PIN SHAPES
app.get('/api/admin/pin-shapes', async (req,res) => {
  const { rows } = await pool.query('SELECT * FROM pin_shapes ORDER BY sort_order');
  res.json(rows);
});
app.post('/api/admin/save-pin-shapes', async (req,res) => {
  await replaceTable("pin_shapes", ["name","icon_url","active","sort_order"], req.body);
  res.json({status:"ok"});
});

// PIN COLORS
app.get('/api/admin/pin-colors', async (req,res) => {
  const { rows } = await pool.query('SELECT * FROM pin_colors ORDER BY sort_order');
  res.json(rows);
});
app.post('/api/admin/save-pin-colors', async (req,res) => {
  await replaceTable("pin_colors", ["name","hex","active","sort_order"], req.body);
  res.json({status:"ok"});
});

// STYLES
app.get('/api/admin/styles', async (req,res) => {
  const { rows } = await pool.query('SELECT * FROM styles ORDER BY sort_order');
  res.json(rows);
});
app.post('/api/admin/save-styles', async (req,res) => {
  await replaceTable("styles", ["name","thumbnail_url","asset_url","active","sort_order"], req.body);
  res.json({status:"ok"});
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`🚀 Backend running on ${port}`));

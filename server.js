const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Simple password check
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';

// Login check
app.post('/api/admin/check', (req,res) => {
  if (req.body.password === ADMIN_PASS) res.sendStatus(200);
  else res.sendStatus(401);
});

// Example Products
app.get('/api/admin/products', async (req,res) => {
  const { rows } = await pool.query('SELECT id, name, description, active FROM products ORDER BY id');
  res.json(rows);
});

app.post('/api/admin/save-products', async (req,res) => {
  await pool.query('DELETE FROM products');
  for (const p of req.body) {
    await pool.query('INSERT INTO products(name, description, active) VALUES ($1,$2,$3)', [p.name, p.description, p.active]);
  }
  res.json({status:"ok"});
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`🚀 Admin server running on ${port}`));

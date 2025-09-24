const express = require("express");
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "supersecret";

app.use(express.json());

// Middleware CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Auth middleware for admin routes
function adminAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: "Too many login attempts, please try again later." }
});

// Initialize DB tables
async function initDB() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS product_types (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS poster_formats (
      id SERIAL PRIMARY KEY,
      product_type_id INT REFERENCES product_types(id) ON DELETE CASCADE,
      size_cm TEXT NOT NULL,
      size_in TEXT NOT NULL,
      base_price NUMERIC(10,2) NOT NULL,
      discount_type TEXT DEFAULT 'none',
      discount_value NUMERIC(10,2) DEFAULT 0,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`
  ];
  for (const q of queries) {
    await pool.query(q);
  }
  console.log("✅ Tables product_types and poster_formats ready");
}
initDB();

// API: Public - get products with formats
app.get("/api/products", async (req, res) => {
  try {
    const productsRes = await pool.query("SELECT * FROM product_types WHERE active = true");
    const products = productsRes.rows;

    const formatsRes = await pool.query("SELECT * FROM poster_formats WHERE active = true");
    const formats = formatsRes.rows;

    const data = products.map(p => {
      const pf = formats.filter(f => f.product_type_id === p.id).map(f => {
        let final_price = parseFloat(f.base_price);
        if (f.discount_type === "percent") {
          final_price = f.base_price * (1 - f.discount_value / 100);
        } else if (f.discount_type === "fixed") {
          final_price = f.base_price - f.discount_value;
        }
        return { ...f, final_price };
      });
      return { ...p, formats: pf };
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching products" });
  }
});

// Admin: Login check (rate limited)
app.get("/api/admin/check", loginLimiter, adminAuth, (req, res) => {
  res.json({ success: true });
});

// Admin: Add product type
app.post("/api/admin/products", adminAuth, async (req, res) => {
  try {
    const { name, description, active } = req.body;
    const result = await pool.query(
      "INSERT INTO product_types (name, description, active) VALUES ($1,$2,$3) RETURNING *",
      [name, description, active ?? true]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error adding product" });
  }
});

// Admin: Update product type
app.put("/api/admin/products/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, active } = req.body;
    const result = await pool.query(
      "UPDATE product_types SET name=$1, description=$2, active=$3, updated_at=NOW() WHERE id=$4 RETURNING *",
      [name, description, active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating product" });
  }
});

// Admin: Add format
app.post("/api/admin/formats", adminAuth, async (req, res) => {
  try {
    const { product_type_id, size_cm, size_in, base_price, discount_type, discount_value, active } = req.body;
    const result = await pool.query(
      `INSERT INTO poster_formats
      (product_type_id, size_cm, size_in, base_price, discount_type, discount_value, active)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [product_type_id, size_cm, size_in, base_price, discount_type, discount_value, active ?? true]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error adding format" });
  }
});

// Admin: Update format
app.put("/api/admin/formats/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { size_cm, size_in, base_price, discount_type, discount_value, active } = req.body;
    const result = await pool.query(
      `UPDATE poster_formats SET size_cm=$1, size_in=$2, base_price=$3, discount_type=$4, discount_value=$5, active=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [size_cm, size_in, base_price, discount_type, discount_value, active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating format" });
  }
});

// Root
app.get("/", (req, res) => {
  res.send("✅ Backend with secured admin routes + rate limiting is running!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

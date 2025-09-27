const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// --- Database ---
const db = new sqlite3.Database("./database.sqlite");

// --- Rate limiting for login ---
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 5,
  message: { success: false, error: "Too many login attempts. Please wait a minute." }
});

// --- Admin password (simple env variable) ---
const ADMIN_PASS = process.env.ADMIN_PASS || "test123";

// --- Auth endpoint ---
app.post("/api/admin/check", loginLimiter, (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASS) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Wrong password" });
  }
});

// --- PRODUCTS ---
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products ORDER BY sort_order", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/products", (req, res) => {
  const {
    name, description, active,
    allow_left, allow_center, allow_right, allow_top,
    allow_back, allow_pins, allow_gift, allow_frames,
    sort_order
  } = req.body;

  db.run(
    `INSERT INTO products (name, description, active, allow_left, allow_center, allow_right, allow_top, allow_back, allow_pins, allow_gift, allow_frames, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [name, description, active, allow_left, allow_center, allow_right, allow_top, allow_back, allow_pins, allow_gift, allow_frames, sort_order],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put("/api/products/:id", (req, res) => {
  const {
    name, description, active,
    allow_left, allow_center, allow_right, allow_top,
    allow_back, allow_pins, allow_gift, allow_frames,
    sort_order
  } = req.body;

  db.run(
    `UPDATE products SET name=?, description=?, active=?, allow_left=?, allow_center=?, allow_right=?, allow_top=?, allow_back=?, allow_pins=?, allow_gift=?, allow_frames=?, sort_order=? WHERE id=?`,
    [name, description, active, allow_left, allow_center, allow_right, allow_top, allow_back, allow_pins, allow_gift, allow_frames, sort_order, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete("/api/products/:id", (req, res) => {
  db.run("DELETE FROM products WHERE id=?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// --- FORMATS ---
app.get("/api/products/:productId/formats", (req, res) => {
  db.all("SELECT * FROM formats WHERE product_id=? ORDER BY sort_order", [req.params.productId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/products/:productId/formats", (req, res) => {
  const {
    width_cm, height_cm, width_in, height_in,
    orientation, px_width, px_height,
    base_price, discount_type, discount_value, active, sort_order
  } = req.body;

  db.run(
    `INSERT INTO formats (product_id, width_cm, height_cm, width_in, height_in, orientation, px_width, px_height, base_price, discount_type, discount_value, active, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [req.params.productId, width_cm, height_cm, width_in, height_in, orientation, px_width, px_height, base_price, discount_type, discount_value, active, sort_order],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put("/api/formats/:id", (req, res) => {
  const {
    width_cm, height_cm, width_in, height_in,
    orientation, px_width, px_height,
    base_price, discount_type, discount_value, active, sort_order
  } = req.body;

  db.run(
    `UPDATE formats SET width_cm=?, height_cm=?, width_in=?, height_in=?, orientation=?, px_width=?, px_height=?, base_price=?, discount_type=?, discount_value=?, active=?, sort_order=? WHERE id=?`,
    [width_cm, height_cm, width_in, height_in, orientation, px_width, px_height, base_price, discount_type, discount_value, active, sort_order, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete("/api/formats/:id", (req, res) => {
  db.run("DELETE FROM formats WHERE id=?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// --- STYLES ---
app.get("/api/products/:productId/styles", (req, res) => {
  db.all("SELECT * FROM styles WHERE product_id=? ORDER BY sort_order", [req.params.productId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/products/:productId/styles", (req, res) => {
  const { name, active, preview_url, sort_order } = req.body;
  db.run(
    `INSERT INTO styles (product_id, name, active, preview_url, sort_order) VALUES (?,?,?,?,?)`,
    [req.params.productId, name, active, preview_url, sort_order],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put("/api/styles/:id", (req, res) => {
  const { name, active, preview_url, sort_order } = req.body;
  db.run(
    `UPDATE styles SET name=?, active=?, preview_url=?, sort_order=? WHERE id=?`,
    [name, active, preview_url, sort_order, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete("/api/styles/:id", (req, res) => {
  db.run("DELETE FROM styles WHERE id=?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// --- FRAME COLORS ---
app.get("/api/frame_colors", (req, res) => {
  db.all("SELECT * FROM frame_colors ORDER BY sort_order", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/frame_colors", (req, res) => {
  const { name, active, thumbnail_url, asset_url, sort_order } = req.body;
  db.run(
    `INSERT INTO frame_colors (name, active, thumbnail_url, asset_url, sort_order) VALUES (?,?,?,?,?)`,
    [name, active, thumbnail_url, asset_url, sort_order],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put("/api/frame_colors/:id", (req, res) => {
  const { name, active, thumbnail_url, asset_url, sort_order } = req.body;
  db.run(
    `UPDATE frame_colors SET name=?, active=?, thumbnail_url=?, asset_url=?, sort_order=? WHERE id=?`,
    [name, active, thumbnail_url, asset_url, sort_order, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete("/api/frame_colors/:id", (req, res) => {
  db.run("DELETE FROM frame_colors WHERE id=?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// --- PIN SHAPES ---
app.get("/api/pin_shapes", (req, res) => {
  db.all("SELECT * FROM pin_shapes ORDER BY sort_order", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/pin_shapes", (req, res) => {
  const { name, active, icon_url, sort_order } = req.body;
  db.run(
    `INSERT INTO pin_shapes (name, active, icon_url, sort_order) VALUES (?,?,?,?)`,
    [name, active, icon_url, sort_order],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put("/api/pin_shapes/:id", (req, res) => {
  const { name, active, icon_url, sort_order } = req.body;
  db.run(
    `UPDATE pin_shapes SET name=?, active=?, icon_url=?, sort_order=? WHERE id=?`,
    [name, active, icon_url, sort_order, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete("/api/pin_shapes/:id", (req, res) => {
  db.run("DELETE FROM pin_shapes WHERE id=?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// --- PIN COLORS ---
app.get("/api/pin_colors", (req, res) => {
  db.all("SELECT * FROM pin_colors ORDER BY sort_order", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/pin_colors", (req, res) => {
  const { name, hex, active, sort_order } = req.body;
  db.run(
    `INSERT INTO pin_colors (name, hex, active, sort_order) VALUES (?,?,?,?)`,
    [name, hex, active, sort_order],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put("/api/pin_colors/:id", (req, res) => {
  const { name, hex, active, sort_order } = req.body;
  db.run(
    `UPDATE pin_colors SET name=?, hex=?, active=?, sort_order=? WHERE id=?`,
    [name, hex, active, sort_order, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.delete("/api/pin_colors/:id", (req, res) => {
  db.run("DELETE FROM pin_colors WHERE id=?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

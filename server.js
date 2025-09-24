const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Debug log for ADMIN_PASS
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';
console.log("🔐 ADMIN_PASS ustawione na:", ADMIN_PASS);

// Debug login check
app.post('/api/admin/check', (req,res) => {
  console.log("➡️ Klient podał:", req.body.password, " | Backend widzi:", ADMIN_PASS);
  if (req.body.password === ADMIN_PASS) {
    console.log("✅ Hasło poprawne");
    res.sendStatus(200);
  } else {
    console.log("❌ Hasło błędne");
    res.status(401).json({
      error: "Wrong password",
      expected: ADMIN_PASS,
      got: req.body.password
    });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`🚀 Debug backend running on ${port}`));

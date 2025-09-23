const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Testowy endpoint
app.get("/", (req, res) => {
  res.send("✅ Backend działa! Pierwszy test udany.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

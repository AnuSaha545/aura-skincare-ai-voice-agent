const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Aura Skincare backend is running" });
});

const orderRoutes = require("./api/orderRoutes");
app.use("/api/orders", orderRoutes);

const aiRoutes = require("./api/aiRoutes");
app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const { authenticateToken } = require("./middleware/authMiddleware");
const setupSwagger = require("./swagger");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ✅ Setup Swagger
setupSwagger(app);

app.get("/", (req, res) => {
  res.send("🚀 Node Auth API is running!");
});

app.use("/api", authRoutes);

app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({ message: "Protected content", user: req.user });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
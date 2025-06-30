const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const authRoutes = require('./src/routes/auth');
const { authenticateToken } = require("./middleware/authMiddleware");
const setupSwagger = require("./src/config/swagger");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = 5000;
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("screen-stream", (data) => {
    // Broadcast to everyone else
    socket.broadcast.emit("screen-stream", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
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
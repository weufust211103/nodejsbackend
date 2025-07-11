const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const authRoutes = require('./src/routes/auth');
const { authenticateToken } = require("./middleware/authMiddleware");
const setupSwagger = require("./src/config/swagger");
const session = require("express-session");
const passport = require("./src/config/passport");
const cookieParser = require('cookie-parser');
const tiktokRoutes = require('./src/routes/tiktok');
const videoRoutes = require('./src/routes/video');

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

app.use(session({ secret: "TRTRMNMNMRT", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser());
app.use('/api', tiktokRoutes);
app.use('/api/videos', videoRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Node Auth API is running!");
});

app.use("/api", authRoutes);

app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({ message: "Protected content", user: req.user });
});

// ✅ Setup Swagger (moved to after all routes)
setupSwagger(app);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
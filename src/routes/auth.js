const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const passport = require("../config/passport");

dotenv.config();
const prisma = new PrismaClient();
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication routes
 */

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: User already exists
 */
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  const exists = await prisma.users.findFirst({
    where: {
      OR: [
        { email },
        { username }
      ]
    }
  });
  if (exists) return res.status(409).json({ message: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  await prisma.users.create({
    data: { username, email, password_hash: hashed },
  });

  res.status(201).json({ message: "User registered" });
});

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: User not found
 */
router.post("/login", async (req, res) => {
  const { email, username, password } = req.body;

  // Allow login with either email or username
  const user = await prisma.users.findFirst({
    where: {
      OR: [
        email ? { email } : undefined,
        username ? { username } : undefined
      ].filter(Boolean)
    }
  });
  if (!user) return res.status(404).json({ message: "User not found" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ message: "Invalid password" });

  const token = jwt.sign({ id: user.id, email: user.email, username: user.username, role: user.role || "user" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.json({ message: "Logged in", token });
});

// Facebook
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));
router.get("/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/" }),
  (req, res) => {
    // Successful login, send JWT or redirect
    res.json({ message: "Logged in with Facebook", user: req.user });
  }
);

// Google
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Successful login, send JWT or redirect
    res.json({ message: "Logged in with Google", user: req.user });
  }
);

module.exports = router;

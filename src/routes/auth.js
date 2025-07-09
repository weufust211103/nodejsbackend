const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const passport = require("../config/passport");
const authController = require("../controllers/authController");

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
router.post("/register", authController.register);

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
router.post("/login", authController.login);

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

/**
 * @swagger
 * /api/facebook:
 *   get:
 *     summary: Login with Facebook
 *     description: Redirects to Facebook for OAuth login. Use in browser.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Facebook OAuth
 */

/**
 * @swagger
 * /api/google:
 *   get:
 *     summary: Login with Google
 *     description: Redirects to Google for OAuth login. Use in browser.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 */

module.exports = router;

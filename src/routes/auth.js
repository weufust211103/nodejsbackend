const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const passport = require("../config/passport");
const authController = require("../controllers/authController");
const { authenticateJWT } = require('../../middleware/authMiddleware');

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


/**
 * @swagger
 * /api/users/me/profile:
 *   get:
 *     summary: Get the profile of the currently authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *                 bio:
 *                   type: string
 *                 role:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 location:
 *                   type: string
 *                 website:
 *                   type: string
 *                 twitter:
 *                   type: string
 *                 instagram:
 *                   type: string
 *                 youtube:
 *                   type: string
 *       401:
 *         description: "Unauthorized: user id missing"
 *       404:
 *         description: User not found
 */
router.get('/users/me/profile', authenticateJWT, authController.getMyProfile);

/**
 * @swagger
 * /api/users/{id}/profile:
 *   get:
 *     summary: Get user profile by user ID
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *                 bio:
 *                   type: string
 *                 role:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: User not found
 *
 *   put:
 *     summary: Edit user profile by user ID
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: "User's display name"
 *               avatar_url:
 *                 type: string
 *                 description: "URL to user's avatar image"
 *               bio:
 *                 type: string
 *                 description: "User biography/about section"
 *               location:
 *                 type: string
 *                 description: "User's location"
 *               website:
 *                 type: string
 *                 description: "User's website URL"
 *               twitter:
 *                 type: string
 *                 description: "Twitter profile URL or handle"
 *               instagram:
 *                 type: string
 *                 description: "Instagram profile URL or handle"
 *               youtube:
 *                 type: string
 *                 description: "YouTube profile URL or handle"
 *             description: "All fields are optional. Only provided fields will be updated."
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *                 bio:
 *                   type: string
 *                 role:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: User not found
 *
 * /api/users/{id}/channel:
 *   get:
 *     summary: Get user channel details by user ID
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Channel details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChannelStats'
 *       404:
 *         description: Channel not found
 */


// View user profile
router.get('/users/:id/profile', authController.getUserProfile);
// Edit user profile
router.put('/users/:id/profile', authenticateJWT,authController.editUserProfile);
// View user channel details
router.get('/users/:id/channel', authController.getUserChannel);
// Get all channels
router.get('/channels', authController.getAllChannels);
// Get all users
router.get('/users', authController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}/channel/videos:
 *   get:
 *     summary: Get all videos for a user's channel
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: "Page number (default: 1)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: "Number of videos per page (default: 20)"
 *     responses:
 *       200:
 *         description: Paginated list of videos for the user's channel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     videos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Video'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       400:
 *         description: Invalid user ID format
 *       404:
 *         description: Channel not found
 */
router.get('/users/:id/channel/videos', authController.getUserChannelVideos);

module.exports = router;

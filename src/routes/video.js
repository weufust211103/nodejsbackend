const express = require('express');
const multer = require('multer');
const path = require('path');
const videoController = require('../controllers/videoController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/**
 * @swagger
 * /api/videos/upload:
 *   post:
 *     summary: Upload a video with details and settings
 *     tags: [Videos]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - title
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The video file to upload
 *               title:
 *                 type: string
 *                 description: Video title
 *               description:
 *                 type: string
 *                 description: Video description
 *               category:
 *                 type: string
 *                 description: Video category
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags (e.g. "funny, music, dance")
 *               allow_comments:
 *                 type: boolean
 *                 description: Allow comments on this video (default true)
 *               allow_download:
 *                 type: boolean
 *                 description: Allow users to download this video (default false)
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *                 description: Schedule video to be published at a later date/time (ISO8601)
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *       400:
 *         description: Bad request (missing file or required fields)
 *       500:
 *         description: Server error
 */
// POST /api/videos/upload
router.post('/upload', authenticateToken, upload.single('file'), videoController.uploadVideo);

module.exports = router; 
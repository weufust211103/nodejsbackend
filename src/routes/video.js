require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const videoController = require('../controllers/videoController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const router = express.Router();
const { ApifyClient } = require('apify-client');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
 *               visibility:
 *                 type: string
 *                 enum: [public, unlisted, private]
 *                 description: Video visibility status
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
 *       401:
 *         description: Unauthorized. Please Login First to Upload Video.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Please Login First to Upload Video
 *       500:
 *         description: Server error
 */
// POST /api/videos/upload
router.post('/upload', authenticateToken, upload.single('file'), videoController.uploadVideo);

/**
 * @swagger
 * /api/videos/tiktok/guest/fetch:
 *   post:
 *     summary: Fetch TikTok videos for guests (using app credentials)
 *     tags: [TikTok Guest]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cursor:
 *                 type: integer
 *                 description: Cursor for pagination
 *               maxCount:
 *                 type: integer
 *                 description: Maximum number of videos to fetch (default 20)
 *     responses:
 *       200:
 *         description: TikTok videos fetched successfully
 *       503:
 *         description: TikTok integration not configured
 *       500:
 *         description: Server error
 */
// POST /api/videos/tiktok/guest/fetch (no auth required)
router.post('/tiktok/guest/fetch', videoController.getGuestTikTokVideos);

/**
 * @swagger
 * /api/videos/tiktok/guest/sync:
 *   post:
 *     summary: Sync TikTok videos to database (app-level)
 *     tags: [TikTok Guest]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cursor:
 *                 type: integer
 *                 description: Cursor for pagination
 *               maxCount:
 *                 type: integer
 *                 description: Maximum number of videos to fetch (default 20)
 *               saveToDb:
 *                 type: boolean
 *                 description: Whether to save videos to database (default true)
 *     responses:
 *       200:
 *         description: TikTok videos synced successfully
 *       503:
 *         description: TikTok integration not configured
 *       500:
 *         description: Server error
 */
// POST /api/videos/tiktok/guest/sync (no auth required)
router.post('/tiktok/guest/sync', videoController.syncAppTikTokVideos);

/**
 * @swagger
 * /api/videos/tiktok/guest/all:
 *   get:
 *     summary: Get all TikTok videos from database (for guests)
 *     tags: [TikTok Guest]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of videos per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: TikTok videos retrieved successfully
 *       500:
 *         description: Server error
 */
// GET /api/videos/tiktok/guest/all (no auth required)
router.get('/tiktok/guest/all', videoController.getAllTikTokVideos);

/**
 * @swagger
 * /api/videos/tiktok/guest/trending:
 *   get:
 *     summary: Get trending TikTok videos
 *     tags: [TikTok Guest]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of videos to return
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: week
 *         description: Timeframe for trending videos
 *     responses:
 *       200:
 *         description: Trending videos retrieved successfully
 *       500:
 *         description: Server error
 */
// GET /api/videos/tiktok/guest/trending (no auth required)
router.get('/tiktok/guest/trending', videoController.getTrendingTikTokVideos);

/**
 * @swagger
 * /api/videos/tiktok/admin/status:
 *   get:
 *     summary: Get app TikTok configuration status (admin)
 *     tags: [TikTok Admin]
 *     responses:
 *       200:
 *         description: App TikTok status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 configured:
 *                   type: boolean
 *                 hasAccessToken:
 *                   type: boolean
 *                 hasUserId:
 *                   type: boolean
 *       500:
 *         description: Server error
 */
// GET /api/videos/tiktok/admin/status (no auth required for simplicity)
router.get('/tiktok/admin/status', videoController.getAppTikTokStatus);

/**
 * @swagger
 * /api/videos/tiktok/admin/setup:
 *   post:
 *     summary: Setup app TikTok credentials (admin)
 *     tags: [TikTok Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *               - refreshToken
 *               - openId
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: TikTok access token for the app
 *               refreshToken:
 *                 type: string
 *                 description: TikTok refresh token for the app
 *               openId:
 *                 type: string
 *                 description: TikTok open ID for the app
 *               scope:
 *                 type: string
 *                 description: "TikTok scope (default: user.info.basic,video.list)"
 *               expiresIn:
 *                 type: integer
 *                 description: "Token expiration time in seconds (default: 7200)"
 *     responses:
 *       200:
 *         description: App TikTok credentials configured successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 tokenId:
 *                   type: string
 *                 openId:
 *                   type: string
 *                 scope:
 *                   type: string
 *                 expiresIn:
 *                   type: integer
 *       400:
 *         description: Bad request (missing required fields)
 *       500:
 *         description: Server error
 */
// POST /api/videos/tiktok/admin/setup (no auth required for simplicity)
router.post('/tiktok/admin/setup', videoController.setupAppTikTokCredentials);

/**
 * @swagger
 * /api/videos/tiktok/admin/refresh:
 *   post:
 *     summary: Force refresh app TikTok token (admin)
 *     tags: [TikTok Admin]
 *     responses:
 *       200:
 *         description: App TikTok token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 tokenId:
 *                   type: string
 *                 newTokenCreatedAt:
 *                   type: string
 *                 expiresIn:
 *                   type: integer
 *       404:
 *         description: No active app TikTok token found
 *       500:
 *         description: Server error
 */
// POST /api/videos/tiktok/admin/refresh (no auth required for simplicity)
router.post('/tiktok/admin/refresh', videoController.forceRefreshAppToken);

/**
 * @swagger
 * /api/videos/tiktok/status:
 *   get:
 *     summary: Check TikTok connection status
 *     tags: [TikTok]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: TikTok connection status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 connected:
 *                   type: boolean
 *                 hasVideoListScope:
 *                   type: boolean
 *                 scope:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// GET /api/videos/tiktok/status
router.get('/tiktok/status', authenticateToken, videoController.getTikTokConnectionStatus);

/**
 * @swagger
 * /api/videos/tiktok/token/expiration:
 *   get:
 *     summary: Check TikTok token expiration status
 *     tags: [TikTok]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token expiration status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isExpired:
 *                   type: boolean
 *                 tokenAge:
 *                   type: integer
 *                   description: Age of token in seconds
 *                 timeUntilExpiry:
 *                   type: integer
 *                   description: Time until expiry in seconds
 *                 minutesUntilExpiry:
 *                   type: integer
 *                 tokenCreatedAt:
 *                   type: integer
 *                 expiresIn:
 *                   type: integer
 *                 hasRefreshToken:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: TikTok not connected
 *       500:
 *         description: Server error
 */
// GET /api/videos/tiktok/token/expiration
router.get('/tiktok/token/expiration', authenticateToken, videoController.checkTokenExpiration);

/**
 * @swagger
 * /api/videos/tiktok/token/refresh:
 *   post:
 *     summary: Force refresh TikTok access token
 *     tags: [TikTok]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 newTokenCreatedAt:
 *                   type: integer
 *                 expiresIn:
 *                   type: integer
 *       400:
 *         description: No refresh token available
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// POST /api/videos/tiktok/token/refresh
router.post('/tiktok/token/refresh', authenticateToken, videoController.forceRefreshToken);

/**
 * @swagger
 * /api/videos/tiktok/fetch:
 *   post:
 *     summary: Fetch TikTok videos (real-time, no database save)
 *     tags: [TikTok]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cursor:
 *                 type: integer
 *                 description: Cursor for pagination
 *               maxCount:
 *                 type: integer
 *                 description: Maximum number of videos to fetch (default 20)
 *     responses:
 *       200:
 *         description: TikTok videos fetched successfully
 *       401:
 *         description: Unauthorized or TikTok not connected
 *       403:
 *         description: TikTok account missing video.list permission
 *       500:
 *         description: Server error
 */
// POST /api/videos/tiktok/fetch
router.post('/tiktok/fetch', authenticateToken, videoController.getTikTokVideos);

/**
 * @swagger
 * /api/videos/tiktok/sync:
 *   post:
 *     summary: Sync TikTok videos to database
 *     tags: [TikTok]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cursor:
 *                 type: integer
 *                 description: Cursor for pagination
 *               maxCount:
 *                 type: integer
 *                 description: Maximum number of videos to fetch (default 20)
 *               saveToDb:
 *                 type: boolean
 *                 description: Whether to save videos to database (default true)
 *     responses:
 *       200:
 *         description: TikTok videos synced successfully
 *       401:
 *         description: Unauthorized or TikTok not connected
 *       500:
 *         description: Server error
 */
// POST /api/videos/tiktok/sync
router.post('/tiktok/sync', authenticateToken, videoController.syncTikTokVideos);

/**
 * @swagger
 * /api/videos/tiktok/user:
 *   get:
 *     summary: Get user's TikTok videos from database
 *     tags: [TikTok]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of videos per page
 *     responses:
 *       200:
 *         description: User's TikTok videos retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// GET /api/videos/tiktok/user
router.get('/tiktok/user', authenticateToken, videoController.getUserTikTokVideos);

/**
 * @swagger
 * /api/videos/all-with-tags:
 *   get:
 *     summary: Get all videos with tags
 *     tags: [Videos]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of videos per page
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags (e.g. "music,gaming")
 *     responses:
 *       200:
 *         description: All videos with tags retrieved successfully
 *       500:
 *         description: Server error
 */
// GET /api/videos/all-with-tags
router.get('/all-with-tags', videoController.getAllVideosWithTags);

/**
 * @swagger
 * /api/videos/all:
 *   get:
 *     summary: Get all videos
 *     tags: [Videos]
 *     responses:
 *       200:
 *         description: All videos retrieved successfully
 *       500:
 *         description: Server error
 */
// GET /api/videos/all
router.get('/all', videoController.getAllVideos);

/**
 * @swagger
 * /api/videos/next:
 *   get:
 *     summary: Get next video by tag
 *     tags: [Videos]
 *     parameters:
 *       - in: query
 *         name: currentVideoId
 *         schema:
 *           type: string
 *         description: Current video ID
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Tag for filtering
 *     responses:
 *       200:
 *         description: Next video retrieved successfully
 *       400:
 *         description: Bad request (missing current video ID or tag)
 *       500:
 *         description: Server error
 */
// GET /api/videos/next
router.get('/next', videoController.getNextVideoByTag);

/**
 * @swagger
 * /api/videos/{videoId}/views:
 *   post:
 *     summary: Increment the view count for a video
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the video to increment views for
 *     responses:
 *       200:
 *         description: Views incremented successfully
 *       400:
 *         description: Video ID is required
 *       500:
 *         description: Failed to increment views
 */
// POST /api/videos/:videoId/views
router.post('/:videoId/views', videoController.incrementViews);

/**
 * @swagger
 * /api/videos/{videoId}:
 *   get:
 *     summary: Get video details with view count
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 video:
 *                   $ref: '#/components/schemas/Video'
 *       404:
 *         description: Video not found
 *       500:
 *         description: Server error
 */
// GET /api/videos/:videoId
router.get('/:videoId', videoController.getVideo);

/**
 * @swagger
 * /api/videos/channel/{channelId}/views:
 *   get:
 *     summary: Get total views for a channel
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel total views retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 channelId:
 *                   type: string
 *                 totalViews:
 *                   type: integer
 *                 videoCount:
 *                   type: integer
 *       400:
 *         description: Bad request (missing channel ID)
 *       500:
 *         description: Server error
 */
// GET /api/videos/channel/:channelId/views
router.get('/channel/:channelId/views', videoController.getChannelTotalViews);

/**
 * @swagger
 * /api/videos/comment:
 *   post:
 *     summary: Post a comment on a video
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoId
 *               - text
 *             properties:
 *               videoId:
 *                 type: string
 *                 description: The ID of the video to comment on
 *               text:
 *                 type: string
 *                 description: The comment text
 *     responses:
 *       201:
 *         description: Comment posted successfully
 *       400:
 *         description: videoId and text are required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to post comment
 */
router.post('/comment', authenticateToken, videoController.postComment);

/**
 * @swagger
 * /api/videos/like:
 *   post:
 *     summary: Like or unlike a video (toggle)
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - videoId
 *             properties:
 *               videoId:
 *                 type: string
 *                 description: The ID of the video to like/unlike
 *     responses:
 *       200:
 *         description: Like toggled successfully
 *       400:
 *         description: videoId is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to toggle like
 */
router.post('/like', authenticateToken, videoController.toggleLikeVideo);

/**
 * @swagger
 * /api/videos/tiktok/apify/fetch:
 *   post:
 *     summary: Fetch TikTok videos using Apify and save to database
 *     tags: [TikTok]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["fyp"]
 *               limit:
 *                 type: integer
 *                 description: Maximum number of videos to fetch and save
 *                 example: 10
 *     responses:
 *       200:
 *         description: Videos fetched and saved successfully
 *       500:
 *         description: Server error
 */
router.post('/tiktok/apify/fetch', async (req, res) => {
  try {
    const { hashtags = ["fyp"], limit = 20 } = req.body;

    const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

    const input = {
      hashtags,
      resultsPerPage: limit, // Pass limit to Apify actor
      profileScrapeSections: ["videos"],
      profileSorting: "latest",
      excludePinnedPosts: false,
      searchSection: "",
      maxProfilesPerQuery: 10,
      scrapeRelatedVideos: false,
      shouldDownloadVideos: true,
      shouldDownloadCovers: true,
      shouldDownloadSubtitles: true,
      shouldDownloadSlideshowImages: true,
      shouldDownloadAvatars: true,
      shouldDownloadMusicCovers: false,
      proxyCountryCode: "None"
    };

    // Run the Actor and wait for it to finish
    const run = await client.actor("GdWCkxBtKWOsKjdch").call(input);

    // Fetch Actor results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Save up to 'limit' items to your database
    let saved = 0;
    for (const item of items) {
      if (saved >= limit) break;
      if (!item.id) continue;
      const exists = await prisma.videos.findUnique({ where: { tiktok_id: item.id } });
      if (exists) continue;

      await prisma.videos.create({
        data: {
          tiktok_id: item.id,
          title: item.text?.slice(0, 100) || 'No title', // text -> title
          description: item.text || '',
          video_url: Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0 ? item.mediaUrls[0] : '', // mediaUrls[0] -> video_url
          thumbnail_url: item.videoMeta?.coverUrl || '', // videoMeta.coverUrl -> thumbnail_url
          status: 'public',
          views: item.playCount || 0, // playCount -> views
          tiktok_likes: item.diggCount || 0,
          tiktok_comments: item.commentCount || 0,
          tiktok_shares: item.shareCount || 0,
          tiktok_create_time: item.createTimeISO ? new Date(item.createTimeISO) : null,
          is_app_content: true,
          category: 'tiktok',
          tiktok_extra: item // Save the full TikTok object for rich data
        }
      });
      saved++;
    }

    res.json({ message: `Fetched and saved ${saved} TikTok videos.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch or save TikTok videos', reason: err.message });
  }
});

module.exports = router; 
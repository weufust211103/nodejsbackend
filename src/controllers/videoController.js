const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const redis = require('redis');
const publisher = redis.createClient();
const axios = require('axios');
const qs = require('querystring');

// Helper: parse comma-separated tags
function parseTags(tagsString) {
  return tagsString
    ? tagsString.split(',').map(t => t.trim()).filter(Boolean)
    : [];
}

// TikTok API configuration
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';
const TIKTOK_VIDEO_LIST_ENDPOINT = '/video/list/';

// App-level TikTok configuration
const APP_TIKTOK_ACCESS_TOKEN = process.env.APP_TIKTOK_ACCESS_TOKEN;
const APP_TIKTOK_USER_ID = process.env.APP_TIKTOK_USER_ID;
const APP_TIKTOK_REFRESH_TOKEN = process.env.APP_TIKTOK_REFRESH_TOKEN;

// Refresh TikTok access token
async function refreshTikTokToken(refreshToken) {
  try {
    const response = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      qs.stringify({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    throw new Error(`Token refresh failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Get app-level TikTok token from database
async function getAppTikTokToken() {
  try {
    const tokenRecord = await prisma.app_tiktok_tokens.findFirst({
      where: { is_active: true },
      orderBy: { created_at: 'desc' }
    });

    if (!tokenRecord) {
      throw new Error('No active app TikTok token found');
    }

    // Check if token is expired (2 hours = 7200 seconds)
    const tokenAge = Date.now() - tokenRecord.token_created_at.getTime();
    const tokenExpiry = tokenRecord.expires_in * 1000; // Convert to milliseconds

    if (tokenAge > tokenExpiry) {
      // Token expired, refresh it
      console.log('App TikTok token expired, refreshing...');
      const refreshData = await refreshTikTokToken(tokenRecord.refresh_token);
      
      // Update the token record
      const updatedToken = await prisma.app_tiktok_tokens.update({
        where: { id: tokenRecord.id },
        data: {
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || tokenRecord.refresh_token,
          expires_in: refreshData.expires_in,
          token_created_at: new Date(),
          last_refreshed_at: new Date()
        }
      });

      return updatedToken.access_token;
    }

    return tokenRecord.access_token;
  } catch (error) {
    console.error('Get app TikTok token error:', error);
    throw error;
  }
}

// Store new app TikTok token
async function storeAppTikTokToken(tokenData) {
  try {
    // Deactivate any existing tokens
    await prisma.app_tiktok_tokens.updateMany({
      where: { is_active: true },
      data: { is_active: false }
    });

    // Create new token record
    const newToken = await prisma.app_tiktok_tokens.create({
      data: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        open_id: tokenData.open_id,
        scope: tokenData.scope,
        expires_in: tokenData.expires_in,
        token_created_at: new Date(),
        last_refreshed_at: new Date(),
        is_active: true
      }
    });

    return newToken;
  } catch (error) {
    console.error('Store app TikTok token error:', error);
    throw error;
  }
}

// Get valid access token (with automatic refresh) - for user-specific tokens
async function getValidTikTokToken(userId) {
  try {
    const tiktokConfig = await prisma.third_party_configs.findUnique({
      where: {
        user_id_service_name: {
          user_id: userId,
          service_name: 'tiktok'
        }
      }
    });

    if (!tiktokConfig) {
      throw new Error('TikTok not connected');
    }

    const config = tiktokConfig.config_data;
    
    // Check if token is expired (assuming 2 hours = 7200 seconds)
    const tokenAge = Date.now() - (config.token_created_at || 0);
    const tokenExpiry = 7200 * 1000; // 2 hours in milliseconds

    if (tokenAge > tokenExpiry && config.refresh_token) {
      // Token expired, refresh it
      console.log('Refreshing expired TikTok token for user:', userId);
      const refreshData = await refreshTikTokToken(config.refresh_token);
      
      // Update stored token
      await prisma.third_party_configs.update({
        where: {
          user_id_service_name: {
            user_id: userId,
            service_name: 'tiktok'
          }
        },
        data: {
          config_data: {
            ...config,
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token || config.refresh_token,
            token_created_at: Date.now(),
            expires_in: refreshData.expires_in
          },
          updated_at: new Date()
        }
      });

      return refreshData.access_token;
    }

    return config.access_token;
  } catch (error) {
    console.error('Get valid token error:', error);
    throw error;
  }
}

// Fetch videos from TikTok API
async function fetchTikTokVideos(accessToken, cursor = null, maxCount = 20) {
  try {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    const body = {
      max_count: maxCount
    };

    if (cursor) {
      body.cursor = cursor;
    }

    const response = await axios.post(
      `${TIKTOK_API_BASE}${TIKTOK_VIDEO_LIST_ENDPOINT}?fields=cover_image_url,id,title,create_time,view_count,like_count,comment_count,share_count`,
      body,
      { headers }
    );

    return response.data;
  } catch (error) {
    console.error('TikTok API error:', error.response?.data || error.message);
    throw new Error(`TikTok API error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Fetch videos using app-level TikTok credentials (for guests)
async function fetchAppTikTokVideos(cursor = null, maxCount = 20) {
  try {
    const accessToken = await getAppTikTokToken();

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    const body = {
      max_count: maxCount
    };

    if (cursor) {
      body.cursor = cursor;
    }

    const response = await axios.post(
      `${TIKTOK_API_BASE}${TIKTOK_VIDEO_LIST_ENDPOINT}?fields=cover_image_url,id,title,create_time,view_count,like_count,comment_count,share_count`,
      body,
      { headers }
    );

    return response.data;
  } catch (error) {
    console.error('App TikTok API error:', error.response?.data || error.message);
    throw new Error(`App TikTok API error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Save TikTok video to database
async function saveTikTokVideo(tikTokVideo, userId) {
  try {
    // Check if video already exists
    const existingVideo = await prisma.videos.findFirst({
      where: {
        tiktok_id: tikTokVideo.id,
        user_id: userId
      }
    });

    if (existingVideo) {
      // Update existing video with latest data
      return await prisma.videos.update({
        where: { id: existingVideo.id },
        data: {
          title: tikTokVideo.title || existingVideo.title,
          description: tikTokVideo.description || existingVideo.description,
          thumbnail_url: tikTokVideo.cover_image_url || existingVideo.thumbnail_url,
          video_url: tikTokVideo.video_url || existingVideo.video_url,
          views: tikTokVideo.view_count || existingVideo.views,
          tiktok_likes: tikTokVideo.like_count || 0,
          tiktok_comments: tikTokVideo.comment_count || 0,
          tiktok_shares: tikTokVideo.share_count || 0,
          tiktok_create_time: tikTokVideo.create_time ? new Date(tikTokVideo.create_time * 1000) : existingVideo.tiktok_create_time,
          updated_at: new Date()
        }
      });
    } else {
      // Create new video
      return await prisma.videos.create({
        data: {
          title: tikTokVideo.title || 'Untitled TikTok Video',
          description: tikTokVideo.description || '',
          video_url: tikTokVideo.video_url || '',
          thumbnail_url: tikTokVideo.cover_image_url || '',
          user_id: userId,
          status: 'public',
          views: tikTokVideo.view_count || 0,
          tiktok_id: tikTokVideo.id,
          tiktok_likes: tikTokVideo.like_count || 0,
          tiktok_comments: tikTokVideo.comment_count || 0,
          tiktok_shares: tikTokVideo.share_count || 0,
          tiktok_create_time: tikTokVideo.create_time ? new Date(tikTokVideo.create_time * 1000) : null,
          category: 'tiktok',
          allow_comments: true,
          allow_download: false
        }
      });
    }
  } catch (error) {
    console.error('Error saving TikTok video:', error);
    throw error;
  }
}

// Save TikTok video to database (app-level)
async function saveAppTikTokVideo(tikTokVideo) {
  try {
    // Check if video already exists
    const existingVideo = await prisma.videos.findFirst({
      where: {
        tiktok_id: tikTokVideo.id
      }
    });

    if (existingVideo) {
      // Update existing video with latest data
      return await prisma.videos.update({
        where: { id: existingVideo.id },
        data: {
          title: tikTokVideo.title || existingVideo.title,
          description: tikTokVideo.description || existingVideo.description,
          thumbnail_url: tikTokVideo.cover_image_url || existingVideo.thumbnail_url,
          video_url: tikTokVideo.video_url || existingVideo.video_url,
          views: tikTokVideo.view_count || existingVideo.views,
          tiktok_likes: tikTokVideo.like_count || 0,
          tiktok_comments: tikTokVideo.comment_count || 0,
          tiktok_shares: tikTokVideo.share_count || 0,
          tiktok_create_time: tikTokVideo.create_time ? new Date(tikTokVideo.create_time * 1000) : existingVideo.tiktok_create_time,
          updated_at: new Date()
        }
      });
    } else {
      // Create new video (no user_id for app-level videos)
      return await prisma.videos.create({
        data: {
          title: tikTokVideo.title || 'Untitled TikTok Video',
          description: tikTokVideo.description || '',
          video_url: tikTokVideo.video_url || '',
          thumbnail_url: tikTokVideo.cover_image_url || '',
          status: 'public',
          views: tikTokVideo.view_count || 0,
          tiktok_id: tikTokVideo.id,
          tiktok_likes: tikTokVideo.like_count || 0,
          tiktok_comments: tikTokVideo.comment_count || 0,
          tiktok_shares: tikTokVideo.share_count || 0,
          tiktok_create_time: tikTokVideo.create_time ? new Date(tikTokVideo.create_time * 1000) : null,
          category: 'tiktok',
          allow_comments: true,
          allow_download: false,
          is_app_content: true // Flag to identify app-level content
        }
      });
    }
  } catch (error) {
    console.error('Error saving app TikTok video:', error);
    throw error;
  }
}

// Helper function to check if user has TikTok connected
async function checkTikTokConnection(userId) {
  const tiktokConfig = await prisma.third_party_configs.findUnique({
    where: {
      user_id_service_name: {
        user_id: userId,
        service_name: 'tiktok'
      }
    }
  });

  return {
    connected: !!(tiktokConfig && tiktokConfig.config_data.access_token),
    config: tiktokConfig
  };
}

exports.uploadVideo = async (req, res) => {
  try {
    const { title, description, category, allow_comments, allow_download, tags, visibility, notify_subscribers } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const videoUrl = `/uploads/${req.file.filename}`;

    const userId = req.user && req.user.id ? req.user.id : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized: user id missing' });
    const status = visibility || 'public';
    // Create video record
    const video = await prisma.videos.create({
      data: {
        title,
        description,
        category,
        allow_comments: allow_comments !== undefined ? allow_comments === 'true' : true,
        allow_download: allow_download !== undefined ? allow_download === 'true' : false,
        video_url: videoUrl,
        user_id: userId,
        status,
        views: 0,
      },
    });

    // Handle tags (free-form, create if not exist)
    const tagNames = parseTags(tags);
    for (const tagName of tagNames) {
      let tag = await prisma.tags.findUnique({ where: { name: tagName } });
      if (!tag) {
        tag = await prisma.tags.create({ data: { name: tagName } });
      }
      await prisma.video_tags.create({ data: { video_id: video.id, tag_id: tag.id } });
    }

    // Notify subscribers if requested
    if (notify_subscribers === 'true') {
      publisher.publish(`user:${userId}:notifications`, JSON.stringify({
        type: 'video_upload',
        videoId: video.id,
        title: video.title,
        message: 'A new video has been uploaded!'
      }));
    }

    res.status(201).json({ message: 'Upload Video Successful!!' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload video', reason: err.message });
  }
};

// Check TikTok connection status
exports.getTikTokConnectionStatus = async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user id missing' });
    }

    const { connected, config } = await checkTikTokConnection(userId);
    
    res.json({
      success: true,
      connected,
      hasVideoListScope: connected && config?.config_data?.scope?.includes('video.list'),
      scope: config?.config_data?.scope || null
    });
  } catch (error) {
    console.error('Get TikTok connection status error:', error);
    res.status(500).json({ 
      error: 'Failed to get TikTok connection status', 
      reason: error.message 
    });
  }
};

// Get TikTok videos (real-time, no database save)
exports.getTikTokVideos = async (req, res) => {
  try {
    const { cursor, maxCount = 20 } = req.body;
    const userId = req.user && req.user.id ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user id missing' });
    }

    const { connected, config } = await checkTikTokConnection(userId);

    if (!connected) {
      return res.status(401).json({ 
        error: 'TikTok not connected. Please authenticate with TikTok first.' 
      });
    }

    if (!config.config_data.scope.includes('video.list')) {
      return res.status(403).json({ 
        error: 'TikTok account does not have video.list permission. Please reconnect with proper permissions.' 
      });
    }

    const accessToken = await getValidTikTokToken(userId);
    const tikTokData = await fetchTikTokVideos(accessToken, cursor, maxCount);
    
    res.json({
      success: true,
      data: tikTokData.data,
      error: tikTokData.error
    });
  } catch (error) {
    console.error('Get TikTok videos error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch TikTok videos', 
      reason: error.message 
    });
  }
};

// Sync TikTok videos to database
exports.syncTikTokVideos = async (req, res) => {
  try {
    const { cursor, maxCount = 20, saveToDb = true } = req.body;
    const userId = req.user && req.user.id ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user id missing' });
    }

    const { connected, config } = await checkTikTokConnection(userId);

    if (!connected) {
      return res.status(401).json({ 
        error: 'TikTok not connected. Please authenticate with TikTok first.' 
      });
    }

    if (!config.config_data.scope.includes('video.list')) {
      return res.status(403).json({ 
        error: 'TikTok account does not have video.list permission. Please reconnect with proper permissions.' 
      });
    }

    const accessToken = await getValidTikTokToken(userId);
    const tikTokData = await fetchTikTokVideos(accessToken, cursor, maxCount);
    
    let savedVideos = [];
    if (saveToDb && tikTokData.data && tikTokData.data.videos) {
      // Save videos to database
      for (const tikTokVideo of tikTokData.data.videos) {
        try {
          const savedVideo = await saveTikTokVideo(tikTokVideo, userId);
          savedVideos.push(savedVideo);
        } catch (saveError) {
          console.error(`Error saving video ${tikTokVideo.id}:`, saveError);
        }
      }
    }

    res.json({
      success: true,
      data: {
        ...tikTokData.data,
        savedVideos: savedVideos.length
      },
      error: tikTokData.error,
      message: saveToDb ? `Synced ${savedVideos.length} videos to database` : 'Videos fetched successfully (not saved)'
    });
  } catch (error) {
    console.error('Sync TikTok videos error:', error);
    res.status(500).json({ 
      error: 'Failed to sync TikTok videos', 
      reason: error.message 
    });
  }
};

// Get user's TikTok videos from database
exports.getUserTikTokVideos = async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    const { page = 1, limit = 20 } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user id missing' });
    }

    const skip = (page - 1) * limit;
    
    const videos = await prisma.videos.findMany({
      where: {
        user_id: userId,
        tiktok_id: { not: null } // Only TikTok videos
      },
      orderBy: {
        tiktok_create_time: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        video_tags: {
          include: {
            tag: true
          }
        }
      }
    });

    const total = await prisma.videos.count({
      where: {
        user_id: userId,
        tiktok_id: { not: null }
      }
    });

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user TikTok videos error:', error);
    res.status(500).json({ 
      error: 'Failed to get user TikTok videos', 
      reason: error.message 
    });
  }
};

// Increment video views
exports.incrementViews = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    const updatedVideo = await prisma.videos.update({
      where: { id: videoId },
      data: {
        views: {
          increment: 1
        }
      },
      select: {
        id: true,
        title: true,
        views: true
      }
    });

    res.json({ 
      message: 'Views incremented successfully',
      video: updatedVideo
    });
  } catch (err) {
    console.error('Increment views error:', err);
    res.status(500).json({ error: 'Failed to increment views', reason: err.message });
  }
};

// Get total views for a channel
exports.getChannelTotalViews = async (req, res) => {
  try {
    const { channelId } = req.params;
    
    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID is required' });
    }

    // Get all videos for the channel and sum their views
    const videos = await prisma.videos.findMany({
      where: { channel_id: channelId },
      select: {
        views: true
      }
    });

    const totalViews = videos.reduce((sum, video) => sum + video.views, 0);

    res.json({ 
      channelId,
      totalViews,
      videoCount: videos.length
    });
  } catch (err) {
    console.error('Get channel views error:', err);
    res.status(500).json({ error: 'Failed to get channel views', reason: err.message });
  }
};

// Get video with view count
exports.getVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    // Fetch video with user, channel, tags, and tiktok_shares
    const video = await prisma.videos.findUnique({
      where: { id: videoId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar_url: true
          }
        },
        channel: {
          select: {
            id: true,
            name: true
          }
        },
        video_tags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Fetch comments with user info
    const comments = await prisma.comments.findMany({
      where: { video_id: videoId },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar_url: true
          }
        }
      }
    });

    // Count likes for the video
    const likeCount = await prisma.likes.count({
      where: { video_id: videoId, is_liked: true }
    });

    // Share count from tiktok_shares field (if present)
    const shareCount = video.tiktok_shares || 0;

    res.json({
      video,
      comments,
      likeCount,
      shareCount
    });
  } catch (err) {
    console.error('Get video error:', err);
    res.status(500).json({ error: 'Failed to get video', reason: err.message });
  }
};

// Get TikTok videos for guests (using app credentials)
exports.getGuestTikTokVideos = async (req, res) => {
  try {
    const { cursor, maxCount = 20 } = req.body;

    const tikTokData = await fetchAppTikTokVideos(cursor, maxCount);
    
    res.json({
      success: true,
      data: tikTokData.data,
      error: tikTokData.error,
      source: 'app_tiktok'
    });
  } catch (error) {
    console.error('Get guest TikTok videos error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch TikTok videos', 
      reason: error.message 
    });
  }
};

// Sync TikTok videos to database (app-level)
exports.syncAppTikTokVideos = async (req, res) => {
  try {
    const { cursor, maxCount = 20, saveToDb = true } = req.body;

    const tikTokData = await fetchAppTikTokVideos(cursor, maxCount);
    
    let savedVideos = [];
    if (saveToDb && tikTokData.data && tikTokData.data.videos) {
      // Save videos to database
      for (const tikTokVideo of tikTokData.data.videos) {
        try {
          const savedVideo = await saveAppTikTokVideo(tikTokVideo);
          savedVideos.push(savedVideo);
        } catch (saveError) {
          console.error(`Error saving video ${tikTokVideo.id}:`, saveError);
        }
      }
    }

    res.json({
      success: true,
      data: {
        ...tikTokData.data,
        savedVideos: savedVideos.length
      },
      error: tikTokData.error,
      message: saveToDb ? `Synced ${savedVideos.length} videos to database` : 'Videos fetched successfully (not saved)',
      source: 'app_tiktok'
    });
  } catch (error) {
    console.error('Sync app TikTok videos error:', error);
    res.status(500).json({ 
      error: 'Failed to sync TikTok videos', 
      reason: error.message 
    });
  }
};

// Get all TikTok videos from database (for guests)
exports.getAllTikTokVideos = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build where clause
    const whereClause = {
      tiktok_id: { not: null } // Only TikTok videos
    };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const videos = await prisma.videos.findMany({
      where: whereClause,
      orderBy: {
        tiktok_create_time: 'desc'
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        video_tags: {
          include: {
            tag: true
          }
        }
      }
    });

    const total = await prisma.videos.count({
      where: whereClause
    });

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all TikTok videos error:', error);
    res.status(500).json({ 
      error: 'Failed to get TikTok videos', 
      reason: error.message 
    });
  }
};

// Get trending TikTok videos (most viewed/liked)
exports.getTrendingTikTokVideos = async (req, res) => {
  try {
    const { limit = 10, timeframe = 'week' } = req.query;
    
    let dateFilter = new Date();
    if (timeframe === 'week') {
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (timeframe === 'month') {
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    } else if (timeframe === 'day') {
      dateFilter.setDate(dateFilter.getDate() - 1);
    }
    
    const videos = await prisma.videos.findMany({
      where: {
        tiktok_id: { not: null },
        tiktok_create_time: { gte: dateFilter }
      },
      orderBy: [
        { tiktok_likes: 'desc' },
        { views: 'desc' }
      ],
      take: parseInt(limit),
      include: {
        video_tags: {
          include: {
            tag: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        videos,
        timeframe,
        total: videos.length
      }
    });
  } catch (error) {
    console.error('Get trending TikTok videos error:', error);
    res.status(500).json({ 
      error: 'Failed to get trending videos', 
      reason: error.message 
    });
  }
};

// Admin function to set up app TikTok credentials
exports.setupAppTikTokCredentials = async (req, res) => {
  try {
    const { accessToken, refreshToken, openId, scope, expiresIn } = req.body;
    
    if (!accessToken || !refreshToken || !openId) {
      return res.status(400).json({ 
        error: 'Access token, refresh token, and open ID are required' 
      });
    }

    // Store in database
    const tokenRecord = await storeAppTikTokToken({
      access_token: accessToken,
      refresh_token: refreshToken,
      open_id: openId,
      scope: scope || 'user.info.basic,video.list',
      expires_in: expiresIn || 7200
    });
    
    res.json({
      success: true,
      message: 'App TikTok credentials configured successfully',
      tokenId: tokenRecord.id,
      openId: tokenRecord.open_id,
      scope: tokenRecord.scope,
      expiresIn: tokenRecord.expires_in
    });
  } catch (error) {
    console.error('Setup app TikTok credentials error:', error);
    res.status(500).json({ 
      error: 'Failed to setup app TikTok credentials', 
      reason: error.message 
    });
  }
};

// Get app TikTok configuration status
exports.getAppTikTokStatus = async (req, res) => {
  try {
    const tokenRecord = await prisma.app_tiktok_tokens.findFirst({
      where: { is_active: true },
      orderBy: { created_at: 'desc' }
    });
    
    if (!tokenRecord) {
      return res.json({
        success: true,
        configured: false,
        hasActiveToken: false,
        message: 'No active app TikTok token found'
      });
    }

    // Check if token is expired
    const tokenAge = Date.now() - tokenRecord.token_created_at.getTime();
    const tokenExpiry = tokenRecord.expires_in * 1000;
    const isExpired = tokenAge > tokenExpiry;
    const minutesUntilExpiry = Math.floor((tokenExpiry - tokenAge) / (1000 * 60));
    
    res.json({
      success: true,
      configured: true,
      hasActiveToken: true,
      isExpired,
      minutesUntilExpiry: Math.max(0, minutesUntilExpiry),
      tokenAge: Math.floor(tokenAge / 1000), // in seconds
      tokenCreatedAt: tokenRecord.token_created_at,
      lastRefreshedAt: tokenRecord.last_refreshed_at,
      openId: tokenRecord.open_id,
      scope: tokenRecord.scope,
      expiresIn: tokenRecord.expires_in
    });
  } catch (error) {
    console.error('Get app TikTok status error:', error);
    res.status(500).json({ 
      error: 'Failed to get app TikTok status', 
      reason: error.message 
    });
  }
};

// Check token expiration status
exports.checkTokenExpiration = async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user id missing' });
    }

    const tiktokConfig = await prisma.third_party_configs.findUnique({
      where: {
        user_id_service_name: {
          user_id: userId,
          service_name: 'tiktok'
        }
      }
    });

    if (!tiktokConfig) {
      return res.status(404).json({ error: 'TikTok not connected' });
    }

    const config = tiktokConfig.config_data;
    const tokenAge = Date.now() - (config.token_created_at || 0);
    const tokenExpiry = 7200 * 1000; // 2 hours in milliseconds
    const isExpired = tokenAge > tokenExpiry;
    const timeUntilExpiry = Math.max(0, tokenExpiry - tokenAge);
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));

    res.json({
      success: true,
      isExpired,
      tokenAge: Math.floor(tokenAge / 1000), // in seconds
      timeUntilExpiry: Math.floor(timeUntilExpiry / 1000), // in seconds
      minutesUntilExpiry,
      tokenCreatedAt: config.token_created_at,
      expiresIn: config.expires_in,
      hasRefreshToken: !!config.refresh_token
    });
  } catch (error) {
    console.error('Check token expiration error:', error);
    res.status(500).json({ 
      error: 'Failed to check token expiration', 
      reason: error.message 
    });
  }
};

// Force refresh token
exports.forceRefreshToken = async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user id missing' });
    }

    const tiktokConfig = await prisma.third_party_configs.findUnique({
      where: {
        user_id_service_name: {
          user_id: userId,
          service_name: 'tiktok'
        }
      }
    });

    if (!tiktokConfig || !tiktokConfig.config_data.refresh_token) {
      return res.status(400).json({ error: 'No refresh token available' });
    }

    const refreshData = await refreshTikTokToken(tiktokConfig.config_data.refresh_token);
    
    // Update stored token
    await prisma.third_party_configs.update({
      where: {
        user_id_service_name: {
          user_id: userId,
          service_name: 'tiktok'
        }
      },
      data: {
        config_data: {
          ...tiktokConfig.config_data,
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || tiktokConfig.config_data.refresh_token,
          token_created_at: Date.now(),
          expires_in: refreshData.expires_in
        },
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      newTokenCreatedAt: Date.now(),
      expiresIn: refreshData.expires_in
    });
  } catch (error) {
    console.error('Force refresh token error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh token', 
      reason: error.message 
    });
  }
};

// Force refresh app TikTok token
exports.forceRefreshAppToken = async (req, res) => {
  try {
    const tokenRecord = await prisma.app_tiktok_tokens.findFirst({
      where: { is_active: true },
      orderBy: { created_at: 'desc' }
    });

    if (!tokenRecord) {
      return res.status(404).json({ error: 'No active app TikTok token found' });
    }

    const refreshData = await refreshTikTokToken(tokenRecord.refresh_token);
    
    if (!refreshData || !refreshData.access_token) {
      throw new Error('TikTok API did not return a valid access_token. Response: ' + JSON.stringify(refreshData));
    }

    // Update the token record
    const updatedToken = await prisma.app_tiktok_tokens.update({
      where: { id: tokenRecord.id },
      data: {
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || tokenRecord.refresh_token,
        expires_in: refreshData.expires_in,
        token_created_at: new Date(),
        last_refreshed_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'App TikTok token refreshed successfully',
      tokenId: updatedToken.id,
      newTokenCreatedAt: updatedToken.token_created_at,
      expiresIn: updatedToken.expires_in
    });
  } catch (error) {
    console.error('Force refresh app token error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh app token', 
      reason: error.message 
    });
  }
};

// Get all videos with pagination
exports.getAllVideos = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const videos = await prisma.videos.findMany({
      orderBy: { created_at: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        user: { select: { id: true, username: true, avatar_url: true } },
        video_tags: { include: { tag: true } }
      }
    });
    const total = await prisma.videos.count();
    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all videos error:', error);
    res.status(500).json({ error: 'Failed to get videos', reason: error.message });
  }
};

// Get next video by tag, fallback to next video in DB if no tag matches
exports.getNextVideoByTag = async (req, res) => {
  try {
    const { currentVideoId, tag } = req.query;
    let nextVideo = null;
    if (tag) {
      // Find next video with the tag, excluding current video
      nextVideo = await prisma.videos.findFirst({
        where: {
          id: { not: currentVideoId },
          video_tags: {
            some: {
              tag: { name: tag }
            }
          }
        },
        orderBy: { created_at: 'asc' },
        include: {
          user: { select: { id: true, username: true, avatar_url: true } },
          video_tags: { include: { tag: true } }
        }
      });
    }
    // If no video found by tag, get next by created_at
    if (!nextVideo) {
      nextVideo = await prisma.videos.findFirst({
        where: { id: { not: currentVideoId } },
        orderBy: { created_at: 'asc' },
        include: {
          user: { select: { id: true, username: true, avatar_url: true } },
          video_tags: { include: { tag: true } }
        }
      });
    }
    if (!nextVideo) {
      return res.status(404).json({ error: 'No next video found' });
    }
    res.json({ success: true, data: nextVideo });
  } catch (error) {
    console.error('Get next video by tag error:', error);
    res.status(500).json({ error: 'Failed to get next video', reason: error.message });
  }
};

// Get all videos with tags and pagination, filter by tags if provided
exports.getAllVideosWithTags = async (req, res) => {
  try {
    const { page = 1, limit = 20, tags } = req.query;
    const skip = (page - 1) * limit;
    let whereClause = {};
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        whereClause = {
          video_tags: {
            some: {
              tag: {
                name: { in: tagList }
              }
            }
          }
        };
      }
    }
    const videos = await prisma.videos.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        user: { select: { id: true, username: true, avatar_url: true } },
        video_tags: { include: { tag: true } }
      }
    });
    const total = await prisma.videos.count({ where: whereClause });
    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all videos with tags error:', error);
    res.status(500).json({ error: 'Failed to get videos with tags', reason: error.message });
  }
};

// Post a comment on a video
exports.postComment = async (req, res) => {
  try {
    const { videoId, text } = req.body;
    const userId = req.user && req.user.id ? req.user.id : null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user id missing' });
    }
    if (!videoId || !text) {
      return res.status(400).json({ error: 'videoId and text are required' });
    }
    // Create the comment
    const comment = await prisma.comments.create({
      data: {
        video_id: videoId,
        user_id: userId,
        text
      },
      include: {
        user: { select: { id: true, username: true, avatar_url: true } }
      }
    });
    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('Post comment error:', error);
    res.status(500).json({ error: 'Failed to post comment', reason: error.message });
  }
}; 
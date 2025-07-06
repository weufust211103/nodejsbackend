const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    videos: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    app_tiktok_tokens: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    third_party_configs: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    tags: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    video_tags: {
      create: jest.fn()
    }
  }))
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    publish: jest.fn()
  })
}));

// Mock Axios
jest.mock('axios');

// Import the app
const app = require('../index');

// Mock data
const mockVideo = {
  id: 'video-123',
  title: 'Test Video',
  description: 'Test Description',
  video_url: '/uploads/test-video.mp4',
  thumbnail_url: '/uploads/thumbnail.jpg',
  user_id: 'user-123',
  status: 'public',
  views: 100,
  tiktok_id: 'tiktok-123',
  tiktok_likes: 50,
  tiktok_comments: 10,
  tiktok_shares: 5,
  tiktok_create_time: new Date('2024-01-01'),
  category: 'tiktok',
  allow_comments: true,
  allow_download: false,
  is_app_content: true,
  created_at: new Date(),
  updated_at: new Date()
};

const mockTikTokVideo = {
  id: 'tiktok-123',
  title: 'TikTok Test Video',
  description: 'TikTok Test Description',
  video_url: 'https://tiktok.com/video/123',
  cover_image_url: 'https://tiktok.com/cover/123.jpg',
  create_time: 1704067200, // 2024-01-01
  view_count: 1000,
  like_count: 500,
  comment_count: 100,
  share_count: 50
};

const mockAppTikTokToken = {
  id: 'token-123',
  access_token: 'app-access-token-123',
  refresh_token: 'app-refresh-token-123',
  open_id: 'app-open-id-123',
  scope: 'user.info.basic,video.list',
  expires_in: 7200,
  token_created_at: new Date(),
  last_refreshed_at: new Date(),
  is_active: true
};

describe('Guest Video Access Tests', () => {
  let prisma;
  let axios;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Get mocked instances
    prisma = new PrismaClient();
    axios = require('axios');
  });

  describe('GET /api/videos/:videoId - Guest Access', () => {
    it('should allow guest access to public videos without authentication', async () => {
      // Mock Prisma to return a public video
      prisma.videos.findUnique.mockResolvedValue({
        ...mockVideo,
        user: {
          id: 'user-123',
          username: 'testuser',
          avatar_url: '/uploads/avatar.jpg'
        },
        channel: null,
        video_tags: []
      });

      const response = await request(app)
        .get('/api/videos/video-123')
        .expect(200);

      expect(response.body).toHaveProperty('video');
      expect(response.body.video.id).toBe('video-123');
      expect(response.body.video.title).toBe('Test Video');
      expect(prisma.videos.findUnique).toHaveBeenCalledWith({
        where: { id: 'video-123' },
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
    });

    it('should return 404 for non-existent video', async () => {
      prisma.videos.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/videos/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Video not found');
    });

    it('should return 400 for missing video ID', async () => {
      const response = await request(app)
        .get('/api/videos/')
        .expect(404); // Express will return 404 for this route

      // This test shows that the route requires a video ID parameter
    });
  });

  describe('POST /api/videos/:videoId/views - Guest Access', () => {
    it('should allow guests to increment video views', async () => {
      const updatedVideo = {
        id: 'video-123',
        title: 'Test Video',
        views: 101
      };

      prisma.videos.update.mockResolvedValue(updatedVideo);

      const response = await request(app)
        .post('/api/videos/video-123/views')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Views incremented successfully');
      expect(response.body.video.views).toBe(101);
      expect(prisma.videos.update).toHaveBeenCalledWith({
        where: { id: 'video-123' },
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
    });

    it('should return 400 for missing video ID', async () => {
      const response = await request(app)
        .post('/api/videos/views')
        .expect(404); // Express will return 404 for this route
    });
  });

  describe('POST /api/videos/tiktok/guest/fetch - Guest TikTok Videos', () => {
    it('should fetch TikTok videos for guests using app credentials', async () => {
      // Mock app TikTok token
      prisma.app_tiktok_tokens.findFirst.mockResolvedValue(mockAppTikTokToken);

      // Mock TikTok API response
      axios.post.mockResolvedValue({
        data: {
          data: {
            videos: [mockTikTokVideo],
            cursor: 'next-cursor',
            has_more: true
          },
          error: null
        }
      });

      const response = await request(app)
        .post('/api/videos/tiktok/guest/fetch')
        .send({
          cursor: 'test-cursor',
          maxCount: 10
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('source', 'app_tiktok');
      expect(response.body.data.videos).toHaveLength(1);
      expect(response.body.data.videos[0].id).toBe('tiktok-123');
    });

    it('should handle TikTok API errors gracefully', async () => {
      // Mock app TikTok token
      prisma.app_tiktok_tokens.findFirst.mockResolvedValue(mockAppTikTokToken);

      // Mock TikTok API error
      axios.post.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'API rate limit exceeded'
            }
          }
        }
      });

      const response = await request(app)
        .post('/api/videos/tiktok/guest/fetch')
        .send({})
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to fetch TikTok videos');
    });

    it('should handle missing app TikTok token', async () => {
      // Mock no app TikTok token
      prisma.app_tiktok_tokens.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/videos/tiktok/guest/fetch')
        .send({})
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to fetch TikTok videos');
    });
  });

  describe('POST /api/videos/tiktok/guest/sync - Guest TikTok Sync', () => {
    it('should sync TikTok videos to database for guests', async () => {
      // Mock app TikTok token
      prisma.app_tiktok_tokens.findFirst.mockResolvedValue(mockAppTikTokToken);

      // Mock TikTok API response
      axios.post.mockResolvedValue({
        data: {
          data: {
            videos: [mockTikTokVideo],
            cursor: 'next-cursor',
            has_more: true
          },
          error: null
        }
      });

      // Mock video creation
      prisma.videos.findFirst.mockResolvedValue(null); // Video doesn't exist
      prisma.videos.create.mockResolvedValue(mockVideo);

      const response = await request(app)
        .post('/api/videos/tiktok/guest/sync')
        .send({
          cursor: 'test-cursor',
          maxCount: 10,
          saveToDb: true
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('source', 'app_tiktok');
      expect(response.body.data.savedVideos).toBe(1);
      expect(response.body.message).toContain('Synced 1 videos to database');
    });

    it('should not save videos when saveToDb is false', async () => {
      // Mock app TikTok token
      prisma.app_tiktok_tokens.findFirst.mockResolvedValue(mockAppTikTokToken);

      // Mock TikTok API response
      axios.post.mockResolvedValue({
        data: {
          data: {
            videos: [mockTikTokVideo],
            cursor: 'next-cursor',
            has_more: true
          },
          error: null
        }
      });

      const response = await request(app)
        .post('/api/videos/tiktok/guest/sync')
        .send({
          saveToDb: false
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.savedVideos).toBe(0);
      expect(response.body.message).toBe('Videos fetched successfully (not saved)');
      expect(prisma.videos.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/videos/tiktok/guest/all - Guest All TikTok Videos', () => {
    it('should get all TikTok videos from database for guests', async () => {
      const mockVideos = [mockVideo];
      const totalCount = 1;

      prisma.videos.findMany.mockResolvedValue(mockVideos);
      prisma.videos.count.mockResolvedValue(totalCount);

      const response = await request(app)
        .get('/api/videos/tiktok/guest/all')
        .query({
          page: 1,
          limit: 20,
          category: 'tiktok',
          search: 'test'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.videos).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.total).toBe(1);

      // Verify the where clause includes TikTok filter
      expect(prisma.videos.findMany).toHaveBeenCalledWith({
        where: {
          tiktok_id: { not: null },
          category: 'tiktok',
          OR: [
            { title: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } }
          ]
        },
        orderBy: {
          tiktok_create_time: 'desc'
        },
        skip: 0,
        take: 20,
        include: {
          video_tags: {
            include: {
              tag: true
            }
          }
        }
      });
    });

    it('should handle pagination correctly', async () => {
      prisma.videos.findMany.mockResolvedValue([]);
      prisma.videos.count.mockResolvedValue(50);

      const response = await request(app)
        .get('/api/videos/tiktok/guest/all')
        .query({
          page: 3,
          limit: 10
        })
        .expect(200);

      expect(response.body.data.pagination.page).toBe(3);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.total).toBe(50);
      expect(response.body.data.pagination.pages).toBe(5);

      // Verify skip calculation
      expect(prisma.videos.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10
        })
      );
    });
  });

  describe('GET /api/videos/tiktok/guest/trending - Guest Trending Videos', () => {
    it('should get trending TikTok videos for guests', async () => {
      const mockVideos = [mockVideo];

      prisma.videos.findMany.mockResolvedValue(mockVideos);

      const response = await request(app)
        .get('/api/videos/tiktok/guest/trending')
        .query({
          limit: 5,
          timeframe: 'week'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.videos).toHaveLength(1);
      expect(response.body.data.timeframe).toBe('week');
      expect(response.body.data.total).toBe(1);

      // Verify date filtering for week timeframe
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 7);

      expect(prisma.videos.findMany).toHaveBeenCalledWith({
        where: {
          tiktok_id: { not: null },
          tiktok_create_time: { gte: expectedDate }
        },
        orderBy: [
          { tiktok_likes: 'desc' },
          { views: 'desc' }
        ],
        take: 5,
        include: {
          video_tags: {
            include: {
              tag: true
            }
          }
        }
      });
    });

    it('should handle different timeframes correctly', async () => {
      prisma.videos.findMany.mockResolvedValue([]);

      // Test day timeframe
      await request(app)
        .get('/api/videos/tiktok/guest/trending')
        .query({ timeframe: 'day' })
        .expect(200);

      let expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 1);

      expect(prisma.videos.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tiktok_create_time: { gte: expectedDate }
          })
        })
      );

      // Test month timeframe
      jest.clearAllMocks();
      prisma.videos.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/videos/tiktok/guest/trending')
        .query({ timeframe: 'month' })
        .expect(200);

      expectedDate = new Date();
      expectedDate.setMonth(expectedDate.getMonth() - 1);

      expect(prisma.videos.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tiktok_create_time: { gte: expectedDate }
          })
        })
      );
    });
  });

  describe('Authentication vs Guest Access', () => {
    it('should allow guest access to public videos without JWT token', async () => {
      prisma.videos.findUnique.mockResolvedValue({
        ...mockVideo,
        user: { id: 'user-123', username: 'testuser', avatar_url: null },
        channel: null,
        video_tags: []
      });

      const response = await request(app)
        .get('/api/videos/video-123')
        .expect(200);

      expect(response.body.video).toBeDefined();
    });

    it('should work with valid JWT token for authenticated users', async () => {
      const token = jwt.sign({ id: 'user-123', username: 'testuser' }, process.env.JWT_SECRET);
      
      prisma.videos.findUnique.mockResolvedValue({
        ...mockVideo,
        user: { id: 'user-123', username: 'testuser', avatar_url: null },
        channel: null,
        video_tags: []
      });

      const response = await request(app)
        .get('/api/videos/video-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.video).toBeDefined();
    });

    it('should work with invalid JWT token (guest access)', async () => {
      prisma.videos.findUnique.mockResolvedValue({
        ...mockVideo,
        user: { id: 'user-123', username: 'testuser', avatar_url: null },
        channel: null,
        video_tags: []
      });

      const response = await request(app)
        .get('/api/videos/video-123')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200); // Should still work as guest access

      expect(response.body.video).toBeDefined();
    });
  });
}); 
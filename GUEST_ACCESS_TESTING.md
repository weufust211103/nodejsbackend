# Guest Video Access Testing Guide

This guide explains how to test guest video access functionality in your Node.js backend application.

## Overview

Your application supports guest access to videos without requiring authentication. This allows visitors to:
- View public videos
- Increment video view counts
- Access TikTok videos using app-level credentials
- Browse TikTok videos from the database
- View trending videos

## Prerequisites

1. **Server Running**: Make sure your Node.js server is running
2. **Database**: Ensure your database is connected and has some test data
3. **TikTok Integration**: Configure app-level TikTok credentials (optional, for TikTok features)

## Testing Methods

### Method 1: Using the Test Script (Recommended)

Run the provided test script:

```bash
# Install dependencies if not already installed
npm install supertest

# Run the test script
node test-guest-access.js
```

This script will test all guest access endpoints and provide detailed output.

### Method 2: Using Jest (Comprehensive Testing)

```bash
# Install Jest and testing dependencies
npm install --save-dev jest supertest

# Run the comprehensive test suite
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Method 3: Manual Testing with cURL

#### Test Video Access (No Authentication Required)

```bash
# Get a specific video
curl -X GET http://localhost:3000/api/videos/video-id-here

# Increment video views
curl -X POST http://localhost:3000/api/videos/video-id-here/views
```

#### Test TikTok Guest Endpoints

```bash
# Fetch TikTok videos (requires app credentials)
curl -X POST http://localhost:3000/api/videos/tiktok/guest/fetch \
  -H "Content-Type: application/json" \
  -d '{"maxCount": 5}'

# Get all TikTok videos from database
curl -X GET "http://localhost:3000/api/videos/tiktok/guest/all?page=1&limit=10"

# Get trending TikTok videos
curl -X GET "http://localhost:3000/api/videos/tiktok/guest/trending?limit=5&timeframe=week"
```

### Method 4: Using Postman or Similar Tools

1. **Get Video**: `GET http://localhost:3000/api/videos/{videoId}`
2. **Increment Views**: `POST http://localhost:3000/api/videos/{videoId}/views`
3. **Fetch TikTok Videos**: `POST http://localhost:3000/api/videos/tiktok/guest/fetch`
4. **Get All TikTok Videos**: `GET http://localhost:3000/api/videos/tiktok/guest/all`
5. **Get Trending Videos**: `GET http://localhost:3000/api/videos/tiktok/guest/trending`

## Guest Access Endpoints

### 1. Video Access (No Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos/:videoId` | GET | Get video details |
| `/api/videos/:videoId/views` | POST | Increment video views |

### 2. TikTok Guest Endpoints (No Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos/tiktok/guest/fetch` | POST | Fetch TikTok videos via API |
| `/api/videos/tiktok/guest/sync` | POST | Sync TikTok videos to database |
| `/api/videos/tiktok/guest/all` | GET | Get all TikTok videos from database |
| `/api/videos/tiktok/guest/trending` | GET | Get trending TikTok videos |

### 3. Admin TikTok Endpoints (No Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos/tiktok/admin/status` | GET | Check app TikTok configuration |
| `/api/videos/tiktok/admin/setup` | POST | Setup app TikTok credentials |
| `/api/videos/tiktok/admin/refresh` | POST | Refresh app TikTok token |

## Test Scenarios

### Scenario 1: Basic Guest Access
```javascript
// Test video access without authentication
const response = await request(app)
  .get('/api/videos/test-video-id')
  .expect(200);

expect(response.body.video).toBeDefined();
```

### Scenario 2: View Count Increment
```javascript
// Test view increment without authentication
const response = await request(app)
  .post('/api/videos/test-video-id/views')
  .expect(200);

expect(response.body.message).toBe('Views incremented successfully');
```

### Scenario 3: TikTok Integration
```javascript
// Test TikTok video fetching
const response = await request(app)
  .post('/api/videos/tiktok/guest/fetch')
  .send({ maxCount: 5 })
  .expect(200);

expect(response.body.source).toBe('app_tiktok');
```

### Scenario 4: Error Handling
```javascript
// Test invalid video ID
const response = await request(app)
  .get('/api/videos/invalid-id')
  .expect(404);

expect(response.body.error).toBe('Video not found');
```

## Configuration

### Environment Variables

Make sure these environment variables are set:

```env
# Database
DATABASE_URL="your-database-url"

# JWT (for authenticated endpoints)
JWT_SECRET="your-jwt-secret"

# TikTok (for TikTok integration)
TIKTOK_CLIENT_KEY="your-tiktok-client-key"
TIKTOK_CLIENT_SECRET="your-tiktok-client-secret"
APP_TIKTOK_ACCESS_TOKEN="your-app-tiktok-access-token"
APP_TIKTOK_USER_ID="your-app-tiktok-user-id"
APP_TIKTOK_REFRESH_TOKEN="your-app-tiktok-refresh-token"
```

### TikTok App Setup

To test TikTok functionality, you need to set up app-level credentials:

1. **Get App Status**:
   ```bash
   curl -X GET http://localhost:3000/api/videos/tiktok/admin/status
   ```

2. **Setup App Credentials** (if not configured):
   ```bash
   curl -X POST http://localhost:3000/api/videos/tiktok/admin/setup \
     -H "Content-Type: application/json" \
     -d '{
       "accessToken": "your-access-token",
       "refreshToken": "your-refresh-token",
       "openId": "your-open-id",
       "scope": "user.info.basic,video.list",
       "expiresIn": 7200
     }'
   ```

## Troubleshooting

### Common Issues

1. **Server Not Running**
   - Error: `ECONNREFUSED`
   - Solution: Start your server with `npm run dev`

2. **Database Connection Issues**
   - Error: Database connection failed
   - Solution: Check your `DATABASE_URL` and ensure database is running

3. **TikTok API Errors**
   - Error: `Failed to fetch TikTok videos`
   - Solution: Verify TikTok app credentials are properly configured

4. **Video Not Found**
   - Error: `Video not found`
   - Solution: Use a valid video ID from your database

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=app:*
NODE_ENV=development
```

### Test Data Setup

To create test data, you can use the Prisma CLI:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (if you have a seed script)
npx prisma db seed
```

## Security Considerations

1. **Public Access**: Guest endpoints are intentionally public for video viewing
2. **Rate Limiting**: Consider implementing rate limiting for view increments
3. **Input Validation**: All inputs are validated on the server side
4. **Error Handling**: Sensitive information is not exposed in error messages

## Performance Testing

For load testing guest access endpoints:

```bash
# Install artillery for load testing
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 http://localhost:3000/api/videos/test-video-id
```

## Conclusion

Guest video access provides a seamless experience for visitors while maintaining security for protected operations. The testing framework ensures that all guest access functionality works correctly without authentication requirements. 
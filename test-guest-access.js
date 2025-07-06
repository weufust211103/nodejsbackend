const request = require('supertest');
const express = require('express');

// Simple test script to demonstrate guest video access
// This can be run directly with: node test-guest-access.js

// Test configuration
const BASE_URL = 'http://localhost:3000'; // Adjust to your server URL
const TEST_VIDEO_ID = 'test-video-123'; // Use an actual video ID from your database

async function testGuestVideoAccess() {
  console.log('🧪 Testing Guest Video Access Functionality\n');

  try {
    // Test 1: Get video without authentication (guest access)
    console.log('1. Testing GET /api/videos/:videoId (Guest Access)');
    const videoResponse = await request(BASE_URL)
      .get(`/api/videos/${TEST_VIDEO_ID}`)
      .expect(200);

    console.log('✅ Guest can access video:', videoResponse.body.video?.title || 'Video found');
    console.log('   Video ID:', videoResponse.body.video?.id);
    console.log('   Views:', videoResponse.body.video?.views);
    console.log('');

    // Test 2: Increment video views without authentication
    console.log('2. Testing POST /api/videos/:videoId/views (Guest Access)');
    const viewsResponse = await request(BASE_URL)
      .post(`/api/videos/${TEST_VIDEO_ID}/views`)
      .expect(200);

    console.log('✅ Guest can increment views:', viewsResponse.body.message);
    console.log('   Updated views:', viewsResponse.body.video?.views);
    console.log('');

    // Test 3: Get TikTok videos for guests
    console.log('3. Testing POST /api/videos/tiktok/guest/fetch (Guest TikTok Access)');
    const tiktokResponse = await request(BASE_URL)
      .post('/api/videos/tiktok/guest/fetch')
      .send({
        maxCount: 5
      })
      .expect(200);

    console.log('✅ Guest can fetch TikTok videos');
    console.log('   Videos fetched:', tiktokResponse.body.data?.videos?.length || 0);
    console.log('   Source:', tiktokResponse.body.source);
    console.log('');

    // Test 4: Get all TikTok videos from database
    console.log('4. Testing GET /api/videos/tiktok/guest/all (Guest Database Access)');
    const allVideosResponse = await request(BASE_URL)
      .get('/api/videos/tiktok/guest/all')
      .query({
        page: 1,
        limit: 10
      })
      .expect(200);

    console.log('✅ Guest can access TikTok videos from database');
    console.log('   Total videos:', allVideosResponse.body.data?.pagination?.total || 0);
    console.log('   Videos on page:', allVideosResponse.body.data?.videos?.length || 0);
    console.log('');

    // Test 5: Get trending TikTok videos
    console.log('5. Testing GET /api/videos/tiktok/guest/trending (Guest Trending Access)');
    const trendingResponse = await request(BASE_URL)
      .get('/api/videos/tiktok/guest/trending')
      .query({
        limit: 5,
        timeframe: 'week'
      })
      .expect(200);

    console.log('✅ Guest can access trending videos');
    console.log('   Trending videos:', trendingResponse.body.data?.videos?.length || 0);
    console.log('   Timeframe:', trendingResponse.body.data?.timeframe);
    console.log('');

    // Test 6: Test with invalid video ID
    console.log('6. Testing with invalid video ID');
    const invalidResponse = await request(BASE_URL)
      .get('/api/videos/invalid-video-id')
      .expect(404);

    console.log('✅ Properly handles invalid video ID');
    console.log('   Error message:', invalidResponse.body.error);
    console.log('');

    console.log('🎉 All guest access tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Guests can view public videos without authentication');
    console.log('   - Guests can increment video views');
    console.log('   - Guests can access TikTok videos via app credentials');
    console.log('   - Guests can browse TikTok videos from database');
    console.log('   - Guests can view trending videos');
    console.log('   - Proper error handling for invalid requests');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Body:', error.response.body);
    }
    
    console.log('\n💡 Troubleshooting tips:');
    console.log('   - Make sure your server is running on', BASE_URL);
    console.log('   - Verify TEST_VIDEO_ID exists in your database');
    console.log('   - Check if TikTok app credentials are configured');
    console.log('   - Ensure database connection is working');
  }
}

// Test with JWT token (optional)
async function testWithAuthentication() {
  console.log('\n🔐 Testing with Authentication (Optional)\n');

  try {
    // You would need a valid JWT token here
    const token = 'your-jwt-token-here'; // Replace with actual token

    const response = await request(BASE_URL)
      .get(`/api/videos/${TEST_VIDEO_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    console.log('✅ Authenticated access works:', response.body.video?.title);
    console.log('   User can access video with valid token');

  } catch (error) {
    console.log('ℹ️  Authentication test skipped (no valid token)');
    console.log('   This is expected if you don\'t have a valid JWT token');
  }
}

// Run tests
async function runAllTests() {
  await testGuestVideoAccess();
  await testWithAuthentication();
}

// Export for use in other test files
module.exports = {
  testGuestVideoAccess,
  testWithAuthentication,
  runAllTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
} 
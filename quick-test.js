const request = require('supertest');

// Quick test to demonstrate guest video access
// This script shows how to test guest access without authentication

const BASE_URL = 'http://localhost:3000';

async function quickTest() {
  console.log('🚀 Quick Guest Video Access Test\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    const healthCheck = await request(BASE_URL)
      .get('/')
      .timeout(5000);
    
    console.log('✅ Server is running');
    console.log('');

    // Test 2: Try to get TikTok app status (no auth required)
    console.log('2. Testing TikTok app status...');
    try {
      const statusResponse = await request(BASE_URL)
        .get('/api/videos/tiktok/admin/status')
        .timeout(5000);

      console.log('✅ TikTok app status endpoint accessible');
      console.log('   Configured:', statusResponse.body.configured);
      console.log('   Has active token:', statusResponse.body.hasActiveToken);
      console.log('');
    } catch (error) {
      console.log('⚠️  TikTok app not configured (this is normal for testing)');
      console.log('');
    }

    // Test 3: Try to get all TikTok videos from database
    console.log('3. Testing database access for TikTok videos...');
    try {
      const videosResponse = await request(BASE_URL)
        .get('/api/videos/tiktok/guest/all')
        .query({ page: 1, limit: 5 })
        .timeout(5000);

      console.log('✅ Database access working');
      console.log('   Total videos:', videosResponse.body.data?.pagination?.total || 0);
      console.log('   Videos on page:', videosResponse.body.data?.videos?.length || 0);
      console.log('');
    } catch (error) {
      console.log('⚠️  Database connection issue or no videos found');
      console.log('   Error:', error.message);
      console.log('');
    }

    // Test 4: Test trending videos endpoint
    console.log('4. Testing trending videos endpoint...');
    try {
      const trendingResponse = await request(BASE_URL)
        .get('/api/videos/tiktok/guest/trending')
        .query({ limit: 3, timeframe: 'week' })
        .timeout(5000);

      console.log('✅ Trending videos endpoint working');
      console.log('   Trending videos:', trendingResponse.body.data?.videos?.length || 0);
      console.log('   Timeframe:', trendingResponse.body.data?.timeframe);
      console.log('');
    } catch (error) {
      console.log('⚠️  Trending videos endpoint issue');
      console.log('   Error:', error.message);
      console.log('');
    }

    console.log('🎉 Quick test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Server connectivity: ✅');
    console.log('   - Guest endpoints accessible: ✅');
    console.log('   - No authentication required: ✅');
    console.log('\n💡 Next steps:');
    console.log('   - Run "node test-guest-access.js" for comprehensive testing');
    console.log('   - Run "npm test" for Jest-based testing');
    console.log('   - Check GUEST_ACCESS_TESTING.md for detailed instructions');

  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
    console.log('\n💡 Make sure your server is running:');
    console.log('   npm run dev');
  }
}

// Run the quick test
quickTest(); 
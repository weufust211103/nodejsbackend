const request = require('supertest');

// Demonstration of Guest Video Access Testing
// This script shows practical examples of testing guest access functionality

const BASE_URL = 'http://localhost:3000';

async function demonstrateGuestAccess() {
  console.log('🎬 Guest Video Access Demonstration\n');

  // Example 1: Test video access without authentication
  console.log('📹 Example 1: Accessing a video without authentication');
  console.log('   This demonstrates that guests can view public videos');
  console.log('   without needing to log in or provide any credentials.\n');

  try {
    // Note: Replace 'example-video-id' with an actual video ID from your database
    const videoId = 'example-video-id'; // You'll need to replace this
    
    const response = await request(BASE_URL)
      .get(`/api/videos/${videoId}`)
      .timeout(5000);

    if (response.status === 200) {
      console.log('✅ Success: Guest can access video');
      console.log(`   Video Title: ${response.body.video?.title || 'N/A'}`);
      console.log(`   Views: ${response.body.video?.views || 0}`);
      console.log(`   Status: ${response.body.video?.status || 'N/A'}`);
    } else if (response.status === 404) {
      console.log('ℹ️  Video not found (expected if using example ID)');
      console.log('   This shows proper error handling for invalid video IDs');
    }
  } catch (error) {
    console.log('⚠️  Server not running or connection issue');
    console.log('   Start your server with: npm run dev');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 2: Test TikTok guest endpoints
  console.log('📱 Example 2: TikTok Guest Endpoints');
  console.log('   These endpoints allow guests to access TikTok content');
  console.log('   using app-level credentials (no user authentication needed).\n');

  const tiktokEndpoints = [
    {
      name: 'Get TikTok App Status',
      method: 'GET',
      path: '/api/videos/tiktok/admin/status',
      description: 'Check if TikTok app is configured'
    },
    {
      name: 'Get All TikTok Videos',
      method: 'GET', 
      path: '/api/videos/tiktok/guest/all',
      description: 'Browse TikTok videos from database'
    },
    {
      name: 'Get Trending Videos',
      method: 'GET',
      path: '/api/videos/tiktok/guest/trending',
      description: 'View trending TikTok videos'
    }
  ];

  for (const endpoint of tiktokEndpoints) {
    console.log(`🔗 Testing: ${endpoint.name}`);
    console.log(`   ${endpoint.description}`);
    
    try {
      let response;
      if (endpoint.method === 'GET') {
        if (endpoint.path.includes('/all')) {
          response = await request(BASE_URL)
            .get(endpoint.path)
            .query({ page: 1, limit: 5 })
            .timeout(5000);
        } else if (endpoint.path.includes('/trending')) {
          response = await request(BASE_URL)
            .get(endpoint.path)
            .query({ limit: 3, timeframe: 'week' })
            .timeout(5000);
        } else {
          response = await request(BASE_URL)
            .get(endpoint.path)
            .timeout(5000);
        }
      }

      if (response.status === 200) {
        console.log('   ✅ Success: Endpoint accessible');
        
        // Show relevant data based on endpoint
        if (endpoint.path.includes('/status')) {
          console.log(`   Configured: ${response.body.configured}`);
          console.log(`   Has Active Token: ${response.body.hasActiveToken}`);
        } else if (endpoint.path.includes('/all')) {
          console.log(`   Total Videos: ${response.body.data?.pagination?.total || 0}`);
          console.log(`   Videos on Page: ${response.body.data?.videos?.length || 0}`);
        } else if (endpoint.path.includes('/trending')) {
          console.log(`   Trending Videos: ${response.body.data?.videos?.length || 0}`);
          console.log(`   Timeframe: ${response.body.data?.timeframe}`);
        }
      } else {
        console.log(`   ⚠️  Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(response.body).substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('='.repeat(50) + '\n');

  // Example 3: Show the difference between guest and authenticated access
  console.log('🔐 Example 3: Guest vs Authenticated Access');
  console.log('   Demonstrating that guest access works without authentication\n');

  const testCases = [
    {
      name: 'Guest Access (No Token)',
      headers: {},
      expected: 'Should work for public videos'
    },
    {
      name: 'Invalid Token',
      headers: { 'Authorization': 'Bearer invalid-token' },
      expected: 'Should still work (guest fallback)'
    },
    {
      name: 'Valid Token (if available)',
      headers: { 'Authorization': 'Bearer your-valid-token-here' },
      expected: 'Should work with authentication'
    }
  ];

  for (const testCase of testCases) {
    console.log(`🧪 ${testCase.name}`);
    console.log(`   Expected: ${testCase.expected}`);
    
    try {
      const response = await request(BASE_URL)
        .get('/api/videos/example-video-id')
        .set(testCase.headers)
        .timeout(5000);

      if (response.status === 200) {
        console.log('   ✅ Success: Video accessible');
      } else if (response.status === 404) {
        console.log('   ℹ️  Video not found (expected with example ID)');
      } else {
        console.log(`   ⚠️  Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('🎉 Demonstration Complete!\n');
  console.log('📋 Key Points:');
  console.log('   • Guest access works without authentication');
  console.log('   • TikTok endpoints use app-level credentials');
  console.log('   • Public videos are accessible to everyone');
  console.log('   • Error handling works properly');
  console.log('\n💡 Next Steps:');
  console.log('   • Replace example-video-id with real video IDs');
  console.log('   • Configure TikTok app credentials for full functionality');
  console.log('   • Run comprehensive tests with: npm test');
}

// Run the demonstration
demonstrateGuestAccess(); 
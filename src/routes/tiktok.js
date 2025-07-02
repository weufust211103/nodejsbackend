const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const prisma = require('./prisma'); // Adjust path to your Prisma client

// Environment variables
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

if (!CLIENT_KEY || !CLIENT_SECRET || !REDIRECT_URI) {
  throw new Error('Missing TikTok environment variables');
}

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'User must be logged in' });
  }
  next();
};

// GET /api/tiktok - Start TikTok OAuth
router.get('/tiktok', ensureAuthenticated, (req, res) => {
  const csrfState = `${req.session.userId}:${Math.random().toString(36).substring(2)}`;
  res.cookie('csrfState', csrfState, {
    maxAge: 60000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    response_type: 'code',
    scope: 'user.info.basic',
    redirect_uri: REDIRECT_URI,
    state: csrfState,
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  console.log('Redirecting to TikTok auth URL:', authUrl);
  res.redirect(authUrl);
});

// GET /api/tiktok/callback - Handle TikTok OAuth callback
router.get('/tiktok/callback', async (req, res) => {
  const { code, state, error, error_description, log_id } = req.query;
  const csrfState = req.cookies.csrfState;

  // Log query for debugging
  console.log('Callback query:', req.query);

  // Handle TikTok error
  if (error) {
    console.error('TikTok OAuth error:', { error, error_description, log_id });
    return res.status(400).json({
      error: `TikTok OAuth failed: ${error}`,
      details: { error_description, log_id },
    });
  }

  // Validate CSRF state and extract user ID
  if (!code || !state || !csrfState || state !== csrfState) {
    return res.status(400).json({ error: 'Invalid state or missing code' });
  }
  const userId = state.split(':')[0]; // Extract user ID from state

  try {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log('TikTok token response:', tokenData);

    if (tokenData.error_code) {
      return res.status(400).json({
        error: tokenData.message || 'Token exchange failed',
        details: { error_code: tokenData.error_code, log_id: tokenData.log_id },
      });
    }

    if (tokenData.access_token) {
      // Store token data in third_party_configs
      try {
        await prisma.third_party_configs.upsert({
          where: {
            user_id_service_name: {
              user_id: userId,
              service_name: 'tiktok',
            },
          },
          create: {
            user_id: userId,
            service_name: 'tiktok',
            config_data: {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token || null,
              open_id: tokenData.open_id,
              scope: tokenData.scope,
              expires_in: tokenData.expires_in,
            },
            created_at: new Date(),
            updated_at: new Date(),
          },
          update: {
            config_data: {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token || null,
              open_id: tokenData.open_id,
              scope: tokenData.scope,
              expires_in: tokenData.expires_in,
            },
            updated_at: new Date(),
          },
        });
        res.json({ message: 'TikTok authentication successful', tokenData });
      } catch (dbError) {
        console.error('Database error:', dbError);
        res.status(500).json({ error: 'Failed to save TikTok credentials' });
      }
    } else {
      res.status(400).json({ error: 'No access token received', details: tokenData });
    }
  } catch (err) {
    console.error('Token exchange error:', err);
    res.status(500).json({ error: 'Token exchange failed', details: err.message });
  }
});

module.exports = router;
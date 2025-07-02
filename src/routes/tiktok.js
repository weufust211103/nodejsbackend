const express = require('express');
const session = require('express-session');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();

// Initialize Prisma client
const prisma = new PrismaClient();

// Environment variables
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

if (!CLIENT_KEY || !CLIENT_SECRET || !REDIRECT_URI) {
  throw new Error('Missing TikTok environment variables');
}

// Middleware
const ensureAuthenticated = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'User must be logged in' });
  next();
};

// GET /api/tiktok - Start TikTok OAuth
router.get('/tiktok', (req, res) => {
  const csrfState = `${req.session.userId}:${Math.random().toString(36).substring(2)}`;
  res.cookie('csrfState', csrfState, {
    maxAge: 3600000, // Increased to 1 hour
    httpOnly: true,
    secure: process.env.NODE_ENV === 'sandbox',
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
  console.log('Authorization URL with redirect_uri:', authUrl);
  res.redirect(authUrl);
});

// GET /api/tiktok/callback - Handle TikTok OAuth callback
router.get('/tiktok/callback', async (req, res) => {
  const { code, state, error, error_description, log_id } = req.query;
  const csrfState = req.cookies.csrfState;

  console.log('Callback query:', req.query);
  console.log('Expected redirect_uri:', REDIRECT_URI);
  console.log('Received state:', state);
  console.log('Cookie csrfState:', csrfState);
  if (!code) console.error('Code missing');
  if (!state) console.error('State missing');
  if (!csrfState) console.error('csrfState cookie not found or expired');
  if (state !== csrfState) console.error('CSRF mismatch:', { state, csrfState });

  if (!code || !state || !csrfState || state !== csrfState) {
    console.error('CSRF validation failed:', { state, csrfState });
    return res.status(400).json({ error: 'Invalid state or missing code' });
  }

  const userId = state.split(':')[0];
  console.log('Extracted userId:', userId);

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

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error('Token request failed:', { status: tokenRes.status, errorText });
      return res.status(400).json({ error: 'Token request failed', details: errorText });
    }

    const tokenData = await tokenRes.json();
    console.log('TikTok token response:', tokenData);

    if (tokenData.error_code) {
      console.error('Token exchange failed:', tokenData);
      return res.status(400).json({
        error: tokenData.message || 'Token exchange failed',
        details: { error_code: tokenData.error_code, log_id: tokenData.log_id },
      });
    }

    if (tokenData.access_token) {
      // Fetch TikTok user info
      const userInfoRes = await fetch('https://open.tiktokapis.com/v2/user/info/', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userInfo = await userInfoRes.json();
      const openId = tokenData.open_id;
      const email = userInfo.data && userInfo.data.email ? userInfo.data.email : `${openId}@tiktok.local`;
      // Try to find user by email
      let user = await prisma.users.findUnique({ where: { email } });
      if (!user) {
        // Register new user with TikTok info
        user = await prisma.users.create({
          data: {
            username: userInfo.data && userInfo.data.display_name ? userInfo.data.display_name : `tiktok_${openId.substring(0, 8)}`,
            email,
            password_hash: '', // no password for OAuth
          }
        });
      }
      req.session.userId = user.id;
      try {
        await prisma.third_party_configs.upsert({
          where: { user_id_service_name: { user_id: user.id, service_name: 'tiktok' } },
          create: {
            user_id: user.id,
            service_name: 'tiktok',
            config_data: {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token || null,
              open_id: openId,
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
              open_id: openId,
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

// GET /api/logout - User logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
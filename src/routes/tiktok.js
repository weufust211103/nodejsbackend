const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI; // e.g., https://yourdomain.com/auth/tiktok/callback

// Step 1: Redirect to TikTok for login
router.get('/auth/tiktok', (req, res) => {
  const csrfState = Math.random().toString(36).substring(2);
  res.cookie('csrfState', csrfState, { maxAge: 60000, httpOnly: true, secure: true });

  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    response_type: 'code',
    scope: 'user.info.basic',
    redirect_uri: REDIRECT_URI,
    state: csrfState,
  });

  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
});

// Step 2: Handle TikTok callback and exchange code for access token
router.get('/auth/tiktok/callback', async (req, res) => {
  const { code, state } = req.query;
  const csrfState = req.cookies.csrfState;

  if (!code || !state || state !== csrfState) {
    return res.status(400).send('Invalid state or missing code');
  }

  // Exchange code for access token
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
    if (tokenData.access_token) {
      // Save tokenData as needed (e.g., in DB or session)
      res.json(tokenData);
    } else {
      res.status(400).json(tokenData);
    }
  } catch (err) {
    res.status(500).send('Token exchange failed');
  }
});

module.exports = router;
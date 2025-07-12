const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to validate email format
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUUID(uuid) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
}

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    // ... existing registration logic ...
    const exists = await prisma.users.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });
    if (exists) return res.status(409).json({ message: 'User already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: { username, email, password_hash: hashed },
    });

    // Create a channel for the new user
    await prisma.channels.create({
      data: {
        user_id: user.id,
        name: `${username}'s Channel`,
        description: '',
      },
    });

    res.status(201).json({ message: 'User registered and channel created' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error', reason: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    // Only allow login if email or username is provided
    if (!email && !username) {
      return res.status(400).json({ message: 'Email or username is required' });
    }
    // If email is provided, check if it exists
    if (email) {
      const emailExists = await prisma.users.findUnique({ where: { email } });
      if (!emailExists) {
        return res.status(404).json({ message: 'Email not found' });
      }
    }
    // ... existing login logic ...
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          username ? { username } : undefined
        ].filter(Boolean)
      }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid password' });
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username, role: user.role || 'user' }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    res.json({ message: 'Logged in', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error', reason: error.message });
  }
};

// Get user profile by user ID
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!isValidUUID(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar_url: true,
        bio: true,
        role: true,
        created_at: true
      }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', reason: error.message });
  }
};

// Edit user profile by user ID
exports.editUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const loggedInUserId = req.user && req.user.id ? req.user.id : null;
    if (!isValidUUID(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    if (!loggedInUserId || loggedInUserId !== userId) {
      return res.status(403).json({ message: 'Forbidden: You can only edit your own profile' });
    }
    const { username, avatar_url, bio } = req.body;
    const user = await prisma.users.update({
      where: { id: userId },
      data: { username, avatar_url, bio },
      select: {
        id: true,
        username: true,
        email: true,
        avatar_url: true,
        bio: true,
        role: true,
        created_at: true
      }
    });
    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error', reason: error.message });
  }
};

// Get channel details by user ID
exports.getUserChannel = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!isValidUUID(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    // Fetch channel with follows and followers relations
    const channel = await prisma.channels.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        user_id: true,
        name: true,
        description: true,
        created_at: true,
        follows: { select: { id: true } }, // channels this channel follows
        followers: { select: { id: true } } // channels that follow this channel
      }
    });
    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    // Count videos for this channel
    const videosCount = await prisma.videos.count({ where: { channel_id: channel.id } });
    // Count total likes across all videos for this channel
    const likesCount = await prisma.likes.count({ where: { video: { channel_id: channel.id }, is_liked: true } });
    // Sum total views across all videos for this channel
    const videos = await prisma.videos.findMany({ where: { channel_id: channel.id }, select: { views: true } });
    const viewsCount = videos.reduce((sum, v) => sum + (v.views || 0), 0);

    res.json({
      id: channel.id,
      user_id: channel.user_id,
      name: channel.name,
      description: channel.description,
      created_at: channel.created_at,
      followsCount: channel.follows ? channel.follows.length : 0,
      followersCount: channel.followers ? channel.followers.length : 0,
      videosCount: videosCount || 0,
      likesCount: likesCount || 0,
      viewsCount: viewsCount || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', reason: error.message });
  }
};

// Get all channels
exports.getAllChannels = async (req, res) => {
  try {
    const channels = await prisma.channels.findMany({
      select: {
        id: true,
        user_id: true,
        name: true,
        description: true,
        created_at: true
      }
    });
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', reason: error.message });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        avatar_url: true,
        bio: true,
        role: true,
        created_at: true
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', reason: error.message });
  }
}; 
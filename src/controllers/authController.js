const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to validate email format
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    await prisma.users.create({
      data: { username, email, password_hash: hashed },
    });
    res.status(201).json({ message: 'User registered' });
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
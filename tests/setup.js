// tests/setup.js
const dotenv = require('dotenv');

// Load environment variables for testing
dotenv.config({ path: '.env.test' });

// Set test environment variables if not already set
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || 'test-client-key';
process.env.TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || 'test-client-secret';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}; 
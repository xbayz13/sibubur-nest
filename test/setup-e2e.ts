// Global test setup for E2E tests
// This file runs before all E2E tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-e2e-tests';

// Use in-memory SQLite for E2E tests if DATABASE_URL is not set
if (!process.env.DATABASE_URL && !process.env.DB_TYPE) {
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_PATH = ':memory:';
}


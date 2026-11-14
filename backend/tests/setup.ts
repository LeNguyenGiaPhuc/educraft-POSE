// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://educraft:local_dev_only@localhost:5432/educraft?schema=public';
}
process.env.FRONTEND_ORIGINS = 'http://localhost:5173';
process.env.SESSION_COOKIE_NAME = 'educraft_session';
process.env.SESSION_MAX_AGE_DAYS = '7';

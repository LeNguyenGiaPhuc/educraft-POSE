const integrationDatabaseUrl =
  'postgresql://educraft:local_dev_only@127.0.0.1:5432/educraft?schema=integration_test';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = integrationDatabaseUrl;
process.env.FRONTEND_ORIGINS = 'http://localhost:5173';
process.env.SESSION_COOKIE_NAME = 'educraft_session';
process.env.SESSION_MAX_AGE_DAYS = '7';

import { spawnSync } from 'node:child_process';

const databaseUrl =
  'postgresql://educraft:local_dev_only@127.0.0.1:5432/educraft?schema=integration_test';
const parsed = new URL(databaseUrl);

if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  throw new Error('Integration tests are restricted to a local PostgreSQL host');
}

const environment = { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'test' };
function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    env: environment,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('node_modules/prisma/build/index.js', ['migrate', 'deploy']);
run('node_modules/vitest/vitest.mjs', ['run', '--config', 'vitest.integration.config.ts']);

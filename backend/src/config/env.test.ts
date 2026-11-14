import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const validProductionEnv = {
  NODE_ENV: 'production',
  PORT: '4000',
  DATABASE_URL: 'postgresql://user:password@db.example.com:5432/educraft',
  FRONTEND_ORIGINS: 'https://educraft.example.com',
  SESSION_COOKIE_NAME: 'educraft_session',
  SESSION_MAX_AGE_DAYS: '7',
};

describe('parseEnv', () => {
  it('rejects production configuration without an explicit database URL', () => {
    const { DATABASE_URL: _removed, ...input } = validProductionEnv;
    expect(() => parseEnv(input)).toThrow('Invalid environment configuration');
  });

  it('rejects invalid ports, origins, and session lifetimes', () => {
    expect(() =>
      parseEnv({
        ...validProductionEnv,
        PORT: '70000',
        FRONTEND_ORIGINS: 'not-a-url',
        SESSION_MAX_AGE_DAYS: '-1',
      })
    ).toThrow('Invalid environment configuration');
  });

  it('accepts explicit valid production configuration', () => {
    const parsed = parseEnv(validProductionEnv);
    expect(parsed.isProduction).toBe(true);
    expect(parsed.frontendOriginsList).toEqual(['https://educraft.example.com']);
    expect(parsed.sessionMaxAgeMs).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

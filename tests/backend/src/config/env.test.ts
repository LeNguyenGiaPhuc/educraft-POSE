import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../../../backend/src/config/env.js';

const validProductionEnv = {
  NODE_ENV: 'production',
  PORT: '4000',
  DATABASE_URL: 'postgresql://user:password@db.example.com:5432/educraft',
  FRONTEND_ORIGINS: 'https://educraft.example.com',
  SESSION_COOKIE_NAME: 'educraft_session',
  SESSION_MAX_AGE_DAYS: '7',
  ROSTER_TOKEN_SECRET: 'production-roster-token-secret-1234567890',
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

  it('rejects production configuration without a roster token secret', () => {
    const { ROSTER_TOKEN_SECRET: _removed, ...input } = validProductionEnv;
    expect(() => parseEnv(input)).toThrow('Invalid environment configuration');
  });

  it('rejects a roster token secret shorter than 32 characters', () => {
    expect(() => parseEnv({ ...validProductionEnv, ROSTER_TOKEN_SECRET: 'too-short' }))
      .toThrow('Invalid environment configuration');
  });

  it('uses a local-only roster token secret default outside production', () => {
    const parsed = parseEnv({ NODE_ENV: 'development' });
    expect(parsed.ROSTER_TOKEN_SECRET).toContain('local-development-only');
    expect(parsed.ROSTER_TOKEN_SECRET).not.toBe(parsed.DATABASE_URL);
  });

  it('requires a Gemini API key when Gemini is enabled', () => {
    let caught: unknown;
    try {
      parseEnv({ ...validProductionEnv, AI_PROVIDER: 'gemini' });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('Invalid environment configuration');
    expect((caught as Error).cause).toBeInstanceOf(Error);
    expect(((caught as Error).cause as Error).message).toBe(
      'GEMINI_API_KEY is required when AI_PROVIDER is gemini.'
    );
  });

  it('keeps the configured Gemini limits', () => {
    const parsed = parseEnv({
      ...validProductionEnv,
      AI_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'gemini-test',
      AI_TIMEOUT_MS: '45000',
      AI_MAX_RETRIES: '2',
      AI_MAX_REFERENCE_IMAGES: '2',
      AI_MAX_SUBMISSION_IMAGES: '6',
      AI_MAX_TOTAL_BYTES: '4096',
    });

    expect(parsed.AI_PROVIDER).toBe('gemini');
    expect(parsed.GEMINI_MODEL).toBe('gemini-test');
    expect(parsed.AI_TIMEOUT_MS).toBe(45000);
    expect(parsed.AI_MAX_RETRIES).toBe(2);
    expect(parsed.AI_MAX_REFERENCE_IMAGES).toBe(2);
    expect(parsed.AI_MAX_SUBMISSION_IMAGES).toBe(6);
    expect(parsed.AI_MAX_TOTAL_BYTES).toBe(4096);
  });

  it('uses and validates the activity context byte limit', () => {
    expect(parseEnv(validProductionEnv).AI_MAX_TEXT_CONTEXT_BYTES).toBe(200000);
    expect(parseEnv({ ...validProductionEnv, AI_MAX_TEXT_CONTEXT_BYTES: '250000' }).AI_MAX_TEXT_CONTEXT_BYTES).toBe(250000);
    expect(() => parseEnv({ ...validProductionEnv, AI_MAX_TEXT_CONTEXT_BYTES: '9999' })).toThrow('Invalid environment configuration');
    expect(() => parseEnv({ ...validProductionEnv, AI_MAX_TEXT_CONTEXT_BYTES: '2000001' })).toThrow('Invalid environment configuration');
  });
});

import { z } from 'zod';
import { normalizeAcademicYear } from '../shared/academic-year.js';

const emptyStringAsUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL is required'),
  FRONTEND_ORIGINS: z
    .string()
    .trim()
    .min(1, 'FRONTEND_ORIGINS is required')
    .refine((value) => {
      const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean);
      return origins.length > 0 && origins.every((origin) => {
        try {
          const parsed = new URL(origin);
          return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.origin === origin;
        } catch {
          return false;
        }
      });
    }, 'FRONTEND_ORIGINS must contain valid HTTP(S) origins'),
  SESSION_COOKIE_NAME: z.string().trim().min(1).regex(/^[A-Za-z0-9_-]+$/).default('educraft_session'),
  SESSION_MAX_AGE_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  ROSTER_TOKEN_SECRET: z.string().trim().min(32, 'ROSTER_TOKEN_SECRET must contain at least 32 characters'),
  AI_PROVIDER: z.enum(['disabled', 'gemini']).default('disabled'),
  GEMINI_API_KEY: z.preprocess(emptyStringAsUndefined, z.string().trim().min(1).optional()),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-2.5-flash'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(3).default(1),
  AI_MAX_REFERENCE_IMAGES: z.coerce.number().int().min(1).max(10).default(4),
  AI_MAX_SUBMISSION_IMAGES: z.coerce.number().int().min(1).max(20).default(10),
  AI_MAX_TOTAL_BYTES: z.coerce.number().int().min(1).default(15 * 1024 * 1024),
  AI_MAX_TEXT_CONTEXT_BYTES: z.coerce.number().int().min(10_000).max(2_000_000).default(200_000),
  STORAGE_PROVIDER: z.enum(['local', 'supabase']).default('local'),
  STORAGE_ROOT: z.string().trim().min(1).default('./storage_private'),
  SUPABASE_URL: z.preprocess(emptyStringAsUndefined, z.string().url().optional()),
  SUPABASE_SECRET_KEY: z.preprocess(emptyStringAsUndefined, z.string().trim().min(1).optional()),
  SUPABASE_STORAGE_BUCKET: z.preprocess(emptyStringAsUndefined, z.string().trim().min(1).optional()),
  CURRENT_ACADEMIC_YEAR: z.preprocess(emptyStringAsUndefined, z.string().trim().optional()),
});

export function parseEnv(input: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  const nodeEnv = input.NODE_ENV ?? 'development';
  const defaults = nodeEnv === 'production'
    ? {}
    : {
        DATABASE_URL: 'postgresql://educraft:local_dev_only@localhost:5432/educraft?schema=public',
        FRONTEND_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
        ROSTER_TOKEN_SECRET: 'educraft-local-development-only-roster-token-secret-please-change',
      };
  const parsed = envSchema.safeParse({ ...defaults, ...input });

  if (!parsed.success) {
    throw new Error('Invalid environment configuration', { cause: parsed.error });
  }

  if (parsed.data.AI_PROVIDER === 'gemini' && !parsed.data.GEMINI_API_KEY) {
    throw new Error('Invalid environment configuration', {
      cause: new Error('GEMINI_API_KEY is required when AI_PROVIDER is gemini.'),
    });
  }

  if (
    parsed.data.STORAGE_PROVIDER === 'supabase' &&
    (!parsed.data.SUPABASE_URL || !parsed.data.SUPABASE_SECRET_KEY || !parsed.data.SUPABASE_STORAGE_BUCKET)
  ) {
    throw new Error('Invalid environment configuration', {
      cause: new Error(
        'SUPABASE_URL, SUPABASE_SECRET_KEY, and SUPABASE_STORAGE_BUCKET are required when STORAGE_PROVIDER is supabase.'
      ),
    });
  }

  const configuredAcademicYear = parsed.data.CURRENT_ACADEMIC_YEAR ?? '2026-2027';
  const currentAcademicYear = normalizeAcademicYear(configuredAcademicYear);
  if (!currentAcademicYear || (parsed.data.NODE_ENV === 'production' && !parsed.data.CURRENT_ACADEMIC_YEAR)) {
    throw new Error('Invalid environment configuration', {
      cause: new Error('CURRENT_ACADEMIC_YEAR must be a consecutive YYYY-YYYY value.'),
    });
  }

  return {
    ...parsed.data,
    SUPABASE_STORAGE_BUCKET: parsed.data.SUPABASE_STORAGE_BUCKET ?? 'educraft-private',
    CURRENT_ACADEMIC_YEAR: currentAcademicYear,
    frontendOriginsList: parsed.data.FRONTEND_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
    sessionMaxAgeMs: parsed.data.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    isProduction: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',
  };
}

export const env = parseEnv(process.env);

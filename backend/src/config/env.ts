import { z } from 'zod';

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
});

export function parseEnv(input: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  const nodeEnv = input.NODE_ENV ?? 'development';
  const defaults = nodeEnv === 'production'
    ? {}
    : {
        DATABASE_URL: 'postgresql://educraft:local_dev_only@localhost:5432/educraft?schema=public',
        FRONTEND_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
      };
  const parsed = envSchema.safeParse({ ...defaults, ...input });

  if (!parsed.success) {
    throw new Error('Invalid environment configuration', { cause: parsed.error });
  }

  return {
    ...parsed.data,
    frontendOriginsList: parsed.data.FRONTEND_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
    sessionMaxAgeMs: parsed.data.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    isProduction: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',
  };
}

export const env = parseEnv(process.env);

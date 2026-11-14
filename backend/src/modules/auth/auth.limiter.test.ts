import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { requestIdMiddleware } from '../../middleware/request-id.js';
import { createLoginLimiter } from './auth.limiter.js';

describe('createLoginLimiter', () => {
  it('returns the standard error envelope after the configured limit', async () => {
    const app = express();
    app.use(requestIdMiddleware);
    app.post('/login', createLoginLimiter({ max: 2, windowMs: 60_000 }), (_req, res) => {
      res.status(200).json({ data: { success: true } });
    });

    expect((await request(app).post('/login')).status).toBe(200);
    expect((await request(app).post('/login')).status).toBe(200);
    const limited = await request(app).post('/login');

    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 1 phút.',
        requestId: expect.any(String),
      },
    });
  });
});

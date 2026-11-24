import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../backend/src/app.js';

describe('Health and Error contract (E2E)', () => {
  const app = createApp();

  it('GET /api/v1/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data).toHaveProperty('timestamp');
  });

  it('GET /api/v1/unknown-route returns 404 with standardized error format and requestId', async () => {
    const res = await request(app).get('/api/v1/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: expect.any(String),
      requestId: expect.any(String),
    });
  });
});

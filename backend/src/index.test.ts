import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './index';

describe('API Server', () => {
  it('should return 200 OK for the health endpoint', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      message: 'Rare Bird Dashboard API is running',
    });
  });

  it('should return a list of sightings', async () => {
    const response = await request(app).get('/api/sightings');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

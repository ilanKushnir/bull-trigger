// @ts-nocheck
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildServer } from '../src/server';

let app: Awaited<ReturnType<typeof buildServer>>;

describe('API health', () => {
  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /healthz -> 200', async () => {
    const res = await request(app.server).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
}); 
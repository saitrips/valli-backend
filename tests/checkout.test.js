/**
 * Integration test: public checkout flow
 * Run: npm test (requires test DB configured in .env.test)
 */
const request = require('supertest');
const app = require('../src/index');

describe('Public Checkout', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/shop/:slug returns 404 for unknown store', async () => {
    const res = await request(app).get('/api/shop/nonexistent-store-xyz');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /api/shop/:slug/orders validates body', async () => {
    const res = await request(app)
      .post('/api/shop/varnieka/orders')
      .send({ customer: { name: '' }, items: [] });
    expect([400, 404]).toContain(res.status);
  });

  it('protected route rejects without token', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

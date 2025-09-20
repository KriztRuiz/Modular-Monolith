import * as supertest from 'supertest';
import { expect } from 'chai';
import { createApp } from '../src/app';

const request: any = (supertest as any).default ?? supertest;

describe('Store validation (Zod) tests', function () {
  let app: any;
  before(async () => { app = await createApp(); });

  it('GET /store/stores returns 400 when q is an object', async () => {
    const res = await request(app).get('/store/stores').query({ q: { $ne: null } });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property('error', 'INVALID_QUERY');
  });

  it('GET /store/stores/:storeId/products returns 400 when q is an object', async () => {
    const res = await request(app).get('/store/stores/nonexistent/products').query({ q: { $search: 'x' } });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property('error', 'INVALID_QUERY');
  });

  it('POST /store/stores returns 400 when payload invalid', async () => {
    // una llamada sin nombre/slug debe fallar - autenticarse primero
    const login = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'owner@demo.com', password: 'secret123' });
    expect(login.status).to.equal(200);
    const token = login.body.token;
    const res = await request(app).post('/store/stores').set('Authorization', `Bearer ${token}`).send({ some: 'field' });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property('error', 'INVALID_PAYLOAD');
  });
});

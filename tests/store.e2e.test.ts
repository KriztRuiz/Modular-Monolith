import * as supertest from 'supertest';
import { expect } from 'chai';
import { createApp } from '../src/app';

const request: any = (supertest as any).default ?? supertest;

describe('Store E2E', function () {
  // más tiempo por si hay arranque de DB
  this.timeout(20_000);
  let app: any;

  before(async () => {
    app = await createApp();
  });

  it('GET /health responde 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).to.equal(200);
  });

  it('login devuelve token', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'owner@demo.com', password: 'secret123' });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('token').that.is.a('string').with.length.greaterThan(100);

    // guarda el token en el “contexto” de mocha para siguientes tests
    (global as any).__TOKEN__ = res.body.token;
  });

  it('crea una tienda OWNED', async () => {
    const token = (global as any).__TOKEN__;
    expect(token, 'token no definido; ejecuta el test de login primero').to.be.a('string');

    const uniqueSlug = `tienda-e2e-${Date.now()}`;

    const res = await request(app)
      .post('/store/stores')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({ name: 'Tienda E2E', slug: uniqueSlug, type: 'OWNED' });

    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('store');
    expect(res.body.store).to.include({ name: 'Tienda E2E', slug: uniqueSlug, type: 'OWNED' });
  });
});

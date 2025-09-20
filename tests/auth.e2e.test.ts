import { expect } from 'chai';
import * as supertest from 'supertest';
// compatibilidad TS/ESM: `supertest` puede exportar como default en runtime
const request: any = (supertest as any).default ?? supertest;
import { createApp } from '../src/app';
import { di } from '../src/core/di/container';
import { USER_REPO } from '../src/modules/users/app/ports';

describe('Auth E2E', function () {
  let app: any;

  before(async function () {
    app = await createApp();
  });

  it('should return 401 without token and 201 with valid token on /store/stores', async function () {
    // register a user and obtain token
    const email = `test+${Date.now()}@example.com`;
    const password = 'password123';
    const registerRes = await request(app)
      .post('/auth/register')
      .send({ name: 'Test', email, password });
    expect(registerRes.status).to.equal(201);
    const token = registerRes.body.token;
    expect(token).to.be.a('string');

    // try to create a store without token -> Unauthorized
    const resNoToken = await request(app)
      .post('/store/stores')
      .set('Content-Type', 'application/json')
      .send({ name: 'Tienda E2E', slug: `t-${Date.now()}`, type: 'OWNED' });
    expect(resNoToken.status).to.equal(401);

    // create with token -> created
    const resWithToken = await request(app)
      .post('/store/stores')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({ name: 'Tienda E2E', slug: `t-${Date.now()}`, type: 'OWNED' });
    expect(resWithToken.status).to.equal(201);
    expect(resWithToken.body).to.have.property('store');
  });
});

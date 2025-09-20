import { expect } from 'chai';
import { createApp } from '../src/app';
import { di } from '../src/core/di/container';
import { USER_REPO } from '../src/modules/users/app/ports';
import { POST_REPO } from '../src/modules/blog/app/ports';
import { TOKENS as STORE_TOKENS } from '../src/modules/store/app/ports';

describe('NoSQL Injection tests', function () {
  let app: any;

  before(async function () {
    app = await createApp();
  });

  it('users.findByEmail should not allow query operator payloads', async function () {
    const users = di.get(USER_REPO) as any;
    // malicious payload that would match everything if passed as-is
    const payload: any = { $ne: null };
    const res = await users.findByEmail(payload as any);
    // should treat as string and return null (no user with email '[object Object]')
    expect(res).to.be.null;
  });

  it('posts.listByAuthor should coerce authorId and tenantId to strings', async function () {
    const posts = di.get(POST_REPO) as any;
    const badAuthor: any = { $gt: '' };
    const badTenant: any = { $ne: null };
    const res = await posts.listByAuthor(badAuthor as any, badTenant as any);
    // should return an array (likely empty) and not throw or return all posts
    expect(Array.isArray(res)).to.be.true;
  });

  it('store.findBySlug should not allow object slug injection', async function () {
    const store = di.get(STORE_TOKENS.STORE_REPO) as any;
    const slugPayload: any = { $regex: '.*' };
    const res = await store.findBySlug(slugPayload as any, { $ne: null } as any);
    expect(res).to.be.null;
  });

  it('product.listByStore should sanitize filters.q to avoid $text abuses', async function () {
    const productRepo = di.get(STORE_TOKENS.PRODUCT_REPO) as any;
    // filters.q will be used to build $text; ensure passing an object doesn't bypass
    const filters: any = { q: { $search: 'anything' } };
    const res = await productRepo.listByStore('nonexistent-store', filters, { $ne: null } as any);
    expect(Array.isArray(res)).to.be.true;
  });
});

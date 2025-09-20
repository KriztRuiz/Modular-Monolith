import { UserModel } from './model';
import type { UserRepo } from '../app/ports';
import type { User } from '../domain/user';


export function makeMongoUserRepo(): UserRepo {
return {
async create(input) {
const doc = await UserModel.create(input);
return map(doc.toObject());
},
async findByEmail(email) {
// coerce to string to avoid passing query objects (NoSQL injection)
const doc = await UserModel.findOne({ email: String(email) }).lean();
return doc ? map(doc) : null;
},
async findById(id) {
const doc = await UserModel.findById(String(id)).lean();
return doc ? map(doc) : null;
},
async listByTenant(tenantId) {
const q: any = {};
if (tenantId) q.tenantId = String(tenantId);
const docs = await UserModel.find(q).lean();
return docs.map(map);
},
};
}


function map(d: any): User {
return {
id: String(d._id),
name: d.name,
email: d.email,
role: d.role,
passwordHash: d.passwordHash,
tenantId: d.tenantId,
createdAt: d.createdAt,
};
}
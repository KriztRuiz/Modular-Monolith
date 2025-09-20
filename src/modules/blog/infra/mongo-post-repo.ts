import { PostModel } from './model';
import type { PostRepo } from '../app/ports';
import type { Post } from '../domain/post';


export function makeMongoPostRepo(): PostRepo {
return {
async create(input) {
const doc = await PostModel.create(input);
return map(doc.toObject());
},
async findById(id) {
const doc = await PostModel.findById(String(id)).lean();
return doc ? map(doc) : null;
},
async listByAuthor(authorId, tenantId) {
const q: any = { authorId: String(authorId) };
if (tenantId) q.tenantId = String(tenantId);
const docs = await PostModel.find(q).sort({ createdAt: -1 }).lean();
return docs.map(map);
},
};
}


function map(d: any): Post {
return {
id: String(d._id),
title: d.title,
content: d.content,
authorId: d.authorId,
tenantId: d.tenantId,
createdAt: d.createdAt,
};
}
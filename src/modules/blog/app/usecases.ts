import { z } from 'zod';
import type { PostRepo } from './ports';


export const CreatePostInput = z.object({
title: z.string().min(3),
content: z.string().min(1),
authorId: z.string().min(1),
tenantId: z.string().optional(),
});


export class CreatePost {
constructor(private repo: PostRepo) {}
exec(raw: unknown) {
const input = CreatePostInput.parse(raw);
return this.repo.create({
title: input.title,
content: input.content,
authorId: input.authorId,
tenantId: input.tenantId,
});
}
}


export class GetPost {
constructor(private repo: PostRepo) {}
exec(id: string) {
return this.repo.findById(id);
}
}


export class ListPostsByAuthor {
constructor(private repo: PostRepo) {}
exec(authorId: string, tenantId?: string) {
return this.repo.listByAuthor(authorId, tenantId);
}
}
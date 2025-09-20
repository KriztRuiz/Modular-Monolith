import type { Post } from '../domain/post';


export interface PostRepo {
create(input: Omit<Post, 'id' | 'createdAt'>): Promise<Post>;
findById(id: string): Promise<Post | null>;
listByAuthor(authorId: string, tenantId?: string): Promise<Post[]>;
}


export const POST_REPO = 'POST_REPO';
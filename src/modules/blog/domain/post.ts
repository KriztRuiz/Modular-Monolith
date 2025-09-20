export interface Post {
    id: string;
    title: string;
    content: string;
    authorId: string;
    tenantId?: string;
    createdAt: Date;
}
import { Router, type Express } from 'express';
import { di } from '../../../core/di/container';
import { POST_REPO } from '../app/ports';
import { CreatePost, GetPost, ListPostsByAuthor } from '../app/usecases';
import { authRequired } from '../../../core/http/jwt';


export function registerBlogRoutes(app: Express) {
const r = Router();


r.post('/blog/posts', authRequired, async (req, res) => {
const usecase = new CreatePost(di.get(POST_REPO));
const created = await usecase.exec({
...req.body,
authorId: req.user!.id,
tenantId: req.tenantId,
});
res.status(201).json({ post: created });
});


r.get('/blog/posts/:id', async (req, res) => {
const usecase = new GetPost(di.get(POST_REPO));
const post = await usecase.exec(req.params.id);
if (!post) return res.status(404).json({ error: 'NOT_FOUND' });
res.json({ post });
});


r.get('/blog/author/:authorId/posts', async (req, res) => {
const usecase = new ListPostsByAuthor(di.get(POST_REPO));
const posts = await usecase.exec(req.params.authorId, req.tenantId);
res.json({ posts });
});


app.use(r);
}
import { Router, type Express } from 'express';
import { di } from '../../../core/di/container';
import { USER_REPO } from '../app/ports';
import { ListUsers, GetUserById } from '../app/usecases';
import { authRequired, requireRole } from '../../../core/http/jwt';


export function registerUserRoutes(app: Express) {
const r = Router();


r.get('/users', authRequired, requireRole('admin'), async (req, res) => {
const usecase = new ListUsers(di.get(USER_REPO));
const users = await usecase.exec(req.tenantId);
res.json({ users });
});


r.get('/users/:id', authRequired, async (req, res) => {
const usecase = new GetUserById(di.get(USER_REPO));
const user = await usecase.exec(req.params.id);
if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});


app.use(r);
}
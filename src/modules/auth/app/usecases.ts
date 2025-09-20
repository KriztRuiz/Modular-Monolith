import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { di } from '../../../core/di/container';
import { USER_REPO, type UserRepo } from '../../../modules/users/app/ports';
import { env } from '../../../core/env';
import { AppError, Unauthorized } from '../../../core/http/errors';


export const RegisterInput = z.object({
name: z.string().min(2),
email: z.string().email(),
password: z.string().min(6),
role: z.enum(['user', 'admin']).optional().default('user'),
tenantId: z.string().optional(),
});


export const LoginInput = z.object({
email: z.string().email(),
password: z.string().min(6),
});


export class Register {
private users: UserRepo = di.get(USER_REPO);
async exec(raw: unknown) {
const input = RegisterInput.parse(raw);
const existing = await this.users.findByEmail(input.email);
if (existing) throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');
const passwordHash = await bcrypt.hash(input.password, 10);
const u = await this.users.create({
name: input.name,
email: input.email,
role: input.role,
passwordHash,
tenantId: input.tenantId,
});
const token = jwt.sign({ id: u.id, role: u.role, tenantId: u.tenantId }, env.JWT_SECRET, { expiresIn: '7d' });
return { user: { id: u.id, name: u.name, email: u.email, role: u.role }, token };
}
}


export class Login {
private users: UserRepo = di.get(USER_REPO);
async exec(raw: unknown) {
const input = LoginInput.parse(raw);
const u = await this.users.findByEmail(input.email);
if (!u) throw new Unauthorized('Invalid credentials');
const ok = await bcrypt.compare(input.password, u.passwordHash);
if (!ok) throw new Unauthorized('Invalid credentials');
const token = jwt.sign({ id: u.id, role: u.role, tenantId: u.tenantId }, env.JWT_SECRET, { expiresIn: '7d' });
return { user: { id: u.id, name: u.name, email: u.email, role: u.role }, token };
}
}
import type { User } from '../domain/user';


export interface UserRepo {
create(input: Omit<User, 'id' | 'createdAt'>): Promise<User>;
findByEmail(email: string): Promise<User | null>;
findById(id: string): Promise<User | null>;
listByTenant(tenantId?: string): Promise<User[]>;
}


export const USER_REPO = 'USER_REPO';
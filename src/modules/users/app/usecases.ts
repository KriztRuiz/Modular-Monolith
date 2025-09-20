import type { UserRepo } from './ports';
import type { User } from '../domain/user';


export class ListUsers {
constructor(private repo: UserRepo) {}
exec(tenantId?: string): Promise<User[]> {
return this.repo.listByTenant(tenantId);
}
}


export class GetUserById {
constructor(private repo: UserRepo) {}
exec(id: string) {
return this.repo.findById(id);
}
}
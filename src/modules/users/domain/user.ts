export interface User {
id: string;
name: string;
email: string;
role: 'user' | 'admin';
passwordHash: string;
tenantId?: string; // si manejas multi-tenant por fila
createdAt: Date;
}
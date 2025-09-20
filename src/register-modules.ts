import type { AppModule } from './core/types';
import { usersModule } from './modules/users';
import { authModule } from './modules/auth';
import { blogModule } from './modules/blog';
import { storeModule } from './modules/store/index';

export const modules: AppModule[] =[
    usersModule, 
    authModule, 
    blogModule,
    storeModule
];

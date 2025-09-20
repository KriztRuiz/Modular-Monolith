import type { Express } from 'express';

export interface AppModule {
  id: string;
  init?: () => void | Promise<void>;
  routes?: (app: Express) => void;
  subscribers?: Array<() => void>;
}

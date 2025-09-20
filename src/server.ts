import { createApp } from './app';
import { env } from './core/env';
import { log } from './core/logger';


createApp().then((app) => {
app.listen(env.PORT, () => log.info(`HTTP server on :${env.PORT}`));
});
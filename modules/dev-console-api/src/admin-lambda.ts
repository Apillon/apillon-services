import type { Context } from 'aws-lambda';
import { proxy, Response } from 'aws-serverless-express';
import { Server } from 'http';
import { bootstrapModule } from './lambda';
import { AdminPanelModule } from './modules/admin-panel/admin-panel.module';

export async function bootstrap() {
  return bootstrapModule(AdminPanelModule);
}

let cachedServer: Server;

export async function handler(event: any, context: Context): Promise<Response> {
  // console.log(`APP_ENV=${process.env.APP_ENV}`);
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return proxy(cachedServer, event, context, 'PROMISE').promise;
}

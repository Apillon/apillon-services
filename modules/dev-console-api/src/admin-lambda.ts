import type { Context } from 'aws-lambda';
import { proxy, Response } from 'aws-serverless-express';
import { Server } from 'http';
import { AdminAppModule } from './admin-app.module';
import { bootstrapModule } from './lambda';

export async function bootstrap() {
  return bootstrapModule(AdminAppModule);
}

let cachedServer: Server;

export async function handler(event: any, context: Context): Promise<Response> {
  // console.log(`APP_ENV=${process.env.APP_ENV}`);
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return proxy(cachedServer, event, context, 'PROMISE').promise;
}

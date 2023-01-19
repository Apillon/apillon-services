import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Context } from 'aws-lambda';
import { createServer, proxy, Response } from 'aws-serverless-express';
import * as express from 'express';

import { Server } from 'http';
import { AppModule } from './app.module';
import { ExceptionsFilter, ResponseInterceptor } from '@apillon/modules-lib';

export async function bootstrap() {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);
  app.enableCors({ origin: '*' });
  app.useGlobalFilters(new ExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  await app.init();
  return createServer(expressApp);
}

let cachedServer: Server;

export async function handler(event: any, context: Context): Promise<Response> {
  // console.log(`APP_ENV=${process.env.APP_ENV}`);
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return proxy(cachedServer, event, context, 'PROMISE').promise;
}

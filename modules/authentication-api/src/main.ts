import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExceptionsFilter, ResponseInterceptor } from '@apillon/modules-lib';
import { env } from '@apillon/lib';
import type { Context } from 'aws-lambda/handler';
import { IdentityService } from './modules/identity/identity.service';
import { IdentityEventType } from './config/types';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalFilters(new ExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(env.AUTH_API_PORT, env.AUTH_API_HOST);

  console.log(`Listening on ${env.AUTH_API_PORT}:${env.AUTH_API_HOST}`);
}

bootstrap().catch((err) => console.error(err.message));

// Worker event processor
export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [IdentityEventType.CREATE_DECENTRALIZED_IDENTITY]: new IdentityService()
      .generateIdentity,
  };

  return await processors[event.eventName](event, context);
}

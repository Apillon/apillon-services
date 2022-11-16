import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExceptionsFilter, ResponseInterceptor } from '@apillon/modules-lib';
import { env } from '@apillon/lib';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalFilters(new ExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(env.AUTH_API_PORT, env.AUTH_API_HOST);

  console.log(`Listening on ${env.AUTH_API_PORT}:${env.AUTH_API_HOST}`);
}
bootstrap().catch((err) => console.error(err.message));

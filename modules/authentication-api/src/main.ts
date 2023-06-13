import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExceptionsFilter, ResponseInterceptor } from '@apillon/modules-lib';
import { env } from '@apillon/lib';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalFilters(new ExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(helmet());

  await app.listen(env.AUTH_API_PORT, env.AUTH_API_HOST);

  console.log(`Listening on ${env.AUTH_API_PORT}:${env.AUTH_API_HOST}`);
}

bootstrap().catch((err) => console.error(err.message));

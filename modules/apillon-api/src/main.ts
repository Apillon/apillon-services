import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExceptionsFilter } from '@apillon/modules-lib';
import { env } from '@apillon/lib';
import { ApillonApiResponseInterceptor } from './interceptors/response.interceptor';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalFilters(new ExceptionsFilter());
  app.useGlobalInterceptors(new ApillonApiResponseInterceptor());
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(helmet());

  await app.listen(env.APILLON_API_PORT, env.APILLON_API_HOST);

  console.log(`Listening on ${env.APILLON_API_PORT}:${env.APILLON_API_HOST}`);
}
bootstrap().catch((err) => console.error(err.message));

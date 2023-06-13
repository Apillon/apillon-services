import { NestFactory } from '@nestjs/core';
import { env } from '@apillon/lib';
import { AppModule } from './app.module';
import { ExceptionsFilter, ResponseInterceptor } from '@apillon/modules-lib';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalFilters(new ExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(helmet());

  await app.listen(env.DEV_CONSOLE_API_PORT, env.DEV_CONSOLE_API_HOST);

  console.log(
    `Listening on ${env.DEV_CONSOLE_API_HOST}:${env.DEV_CONSOLE_API_PORT}`,
  );
}
bootstrap().catch((err) => console.error(err.message));

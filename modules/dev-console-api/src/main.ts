import { NestFactory } from '@nestjs/core';
import { env } from '@apillon/lib';
import { AppModule } from './app.module';
import { ExceptionsFilter, ResponseInterceptor } from '@apillon/modules-lib';
import helmet from 'helmet';
import { AdminAppModule } from './admin-app.module';

export async function bootstrapModule(module: any, envPrefix: string) {
  const app = await NestFactory.create(module, { cors: true });
  app.useGlobalFilters(new ExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(helmet());
  const host = env[`${envPrefix}_CONSOLE_API_HOST`];
  const port = env[`${envPrefix}_CONSOLE_API_PORT`];

  await app.listen(port, host);
  console.info(`Listening on ${host}:${port}`);
}

async function bootstrap() {
  // Bootstrap both dev console API and admin console API with the same config
  await bootstrapModule(AppModule, 'DEV');
  await bootstrapModule(AdminAppModule, 'ADMIN');
}

bootstrap().catch((err) => console.error(err.message));

import { AppEnvironment, env } from '@apillon/lib';
import { ExceptionsFilter, ResponseInterceptor } from '@apillon/modules-lib';
import {
  rebuildTestDatabases,
  setupTestContextAndSql,
  Stage,
} from '@apillon/tests-lib';
import { HttpServer, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

/**
 * Setup test environment. Rebuild BD, run test app and create test stage object
 * @returns
 */
export async function setupTest(): Promise<Stage> {
  let app: INestApplication = null;
  let http: HttpServer = null;

  env.APP_ENV = AppEnvironment.TEST;

  env.DEV_CONSOLE_API_MYSQL_HOST = null; // safety
  env.ACCESS_MYSQL_HOST = null; // safety
  env.MONITORING_MONGO_SRV = null; // safety
  env.STORAGE_MYSQL_HOST = null; // safety
  env.CONFIG_MYSQL_HOST = null; // safety
  env.REFERRAL_MYSQL_HOST = null; // safety

  try {
    await rebuildTestDatabases();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new ExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();

    await app.listen(
      env.DEV_CONSOLE_API_PORT_TEST,
      // For some reason, this causes to bind only a ipv6
      // env.DEV_CONSOLE_API_HOST_TEST,
    );
    http = app.getHttpServer();

    const stage: Stage = await setupTestContextAndSql();
    stage.app = app;
    stage.http = http;

    return stage;
  } catch (e) {
    console.error(e);
    throw new Error('Unable to set up env');
  }
}

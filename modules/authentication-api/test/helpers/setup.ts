import { HttpServer, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppEnvironment, env } from '@apillon/lib';
import { ExceptionsFilter, ResponseInterceptor } from '@apillon/modules-lib';
import {
  rebuildTestDatabases,
  setupTestContextAndSql,
  Stage,
} from '@apillon/tests-lib';
import { AppModule } from '../../src/app.module';

/**
 * Testing stage definition.
 */
export async function setupTest(): Promise<Stage> {
  let app = null;
  let http: HttpServer = null;

  env.APP_ENV = AppEnvironment.TEST;

  env.DEV_CONSOLE_API_MYSQL_HOST = null; // safety
  env.ACCESS_MYSQL_HOST = null; // safety
  env.MONITORING_MONGO_SRV = null; // safety
  env.STORAGE_MYSQL_HOST = null; // safety
  env.CONFIG_MYSQL_HOST = null; // safety
  env.REFERRAL_MYSQL_HOST = null; // safety
  env.NFTS_MYSQL_HOST = null; // safety
  env.AUTH_API_MYSQL_HOST = null; // safety
  env.BLOCKCHAIN_MYSQL_HOST = null; // safety

  try {
    await rebuildTestDatabases();
  } catch (err) {
    console.error(err);
    throw new Error('rebuildTestDatabases failed');
  }

  try {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new ExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();

    await app.listen(
      env.AUTH_API_PORT_TEST,
      // For some reason, this causes to bind only a ipv6 address
      env.AUTH_API_HOST_TEST,
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

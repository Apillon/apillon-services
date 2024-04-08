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
import { AdminAppModule } from '../../src/admin-app.module';

/**
 * Setup test environment. Rebuild BD, run test app and create test stage object
 * @returns
 */
export async function setupTest(
  apiPort = env.DEV_CONSOLE_API_PORT_TEST,
  apiHost = env.DEV_CONSOLE_API_HOST_TEST,
): Promise<Stage> {
  let app: INestApplication = null;
  let http: HttpServer = null;

  env.APP_ENV = AppEnvironment.TEST;

  env.DEV_CONSOLE_API_MYSQL_HOST = null; // safety
  env.ACCESS_MYSQL_HOST = null; // safety
  env.STORAGE_MYSQL_HOST = null; // safety
  env.CONFIG_MYSQL_HOST = null; // safety
  env.REFERRAL_MYSQL_HOST = null; // safety
  env.NFTS_MYSQL_HOST = null; // safety
  env.AUTH_API_MYSQL_HOST = null; // safety
  env.BLOCKCHAIN_MYSQL_HOST = null; // safety
  env.SOCIAL_MYSQL_HOST = null; // safety

  //Solve problem with certificates, when accessing ipfs gateway content through supertest request
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

  try {
    await rebuildTestDatabases();
  } catch (err) {
    console.error(err);
    throw new Error('rebuildTestDatabases failed');
  }

  try {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, AdminAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new ExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();

    await app.listen(apiPort, apiHost);
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

import { AppEnvironment, env } from '@apillon/lib';
import { ExceptionsFilter } from '@apillon/modules-lib';
import {
  rebuildTestDatabases,
  setupTestContextAndSql,
  Stage,
} from '@apillon/tests-lib';
import { HttpServer } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { ApillonApiResponseInterceptor } from '../../src/interceptors/response.interceptor';

/**
 * Setup test environment. Rebuild BD, run test app and create test stage object
 * @returns
 */
export async function setupTest(
  apiPort = env.APILLON_API_PORT_TEST,
  apiHost = env.APILLON_API_HOST_TEST,
): Promise<Stage> {
  let app = null;
  let http: HttpServer = null;

  env.APP_ENV = AppEnvironment.TEST;

  env.DEV_CONSOLE_API_MYSQL_HOST = null; // safety
  env.ACCESS_MYSQL_HOST = null; // safety
  env.MONITORING_MONGO_SRV = null; // safety
  env.STORAGE_MYSQL_HOST = null; // safety
  env.CONFIG_MYSQL_HOST = null; // safety

  //Solve problem with certificates, when accessing ipfs gateway content through supertest request
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

  try {
    await rebuildTestDatabases();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new ExceptionsFilter());
    app.useGlobalInterceptors(new ApillonApiResponseInterceptor());

    await app.init();

    await app.listen(apiPort, apiHost);
    http = app.getHttpServer();

    const stage: Stage = await setupTestContextAndSql();
    stage.app = app;
    stage.http = http;

    return stage;
  } catch (e) {
    console.error(e);
    throw new Error(`Unable to set up env: ${e}`);
  }
}

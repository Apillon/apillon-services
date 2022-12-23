import { HttpServer, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppEnvironment, env, Mongo, MySql } from '@apillon/lib';
import { ExceptionsFilter, ResponseInterceptor } from '@apillon/modules-lib';

import { dropTestDatabases, rebuildTestDatabases } from './migrations';
import { TestContext } from './context';
import { AppModule } from '../../src/app.module';

/**
 * Testing stage definition.
 */
export interface DatabaseState {
  mysql: MySql;
}

export interface Stage {
  app: INestApplication;
  http: HttpServer;
  amsContext?: TestContext;
  lmasContext?: TestContext;
  devConsoleApiContext: TestContext;
  amsSql?: MySql;
  lmasMongo?: Mongo;
  devConsoleApiSql?: MySql;
  storageContext?: TestContext;
  storageSql?: MySql;
}

export async function setupTest(): Promise<Stage> {
  let app: INestApplication = null;
  let http: HttpServer = null;

  env.APP_ENV = AppEnvironment.TEST;

  env.DEV_CONSOLE_API_MYSQL_HOST = null; // safety
  env.ACCESS_MYSQL_HOST = null; // safety
  env.MONITORING_MONGO_SRV = null; // safety

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
      // For some reason, this causes to bind only a ipv6 address
      // env.DEV_CONSOLE_API_HOST_TEST,
    );

    http = app.getHttpServer();
    const devConsoleApiConfig = {
      host: env.DEV_CONSOLE_API_MYSQL_HOST_TEST,
      database: env.DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
      password: env.DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
      port: env.DEV_CONSOLE_API_MYSQL_PORT_TEST,
      user: env.DEV_CONSOLE_API_MYSQL_USER_TEST,
    };
    const devConsoleApiSql = new MySql(devConsoleApiConfig);
    await devConsoleApiSql.connect();

    const devConsoleApiContext = new TestContext();
    devConsoleApiContext.mysql = devConsoleApiSql;

    // const lmasMongo = new Mongo(
    //   env.MONITORING_MONGO_SRV_TEST,
    //   env.MONITORING_MONGO_DATABASE_TEST,
    //   10,
    // );

    // const lmasContext = new TestContext();
    // lmasContext.mongo = lmasMongo;

    return {
      app,
      devConsoleApiContext,
      devConsoleApiSql,
      http,
    };
  } catch (error) {
    throw `Unable to set up env - ${error}`;
  }
}

/**
 * Releases initialized stage - drops DB, closes SQL connection and closes application.
 *
 * @param stage Stage with connected DB instance and application instance.
 */
export const releaseStage = async (stage: Stage): Promise<void> => {
  if (!stage) {
    throw new Error('Error - stage does not exist');
  }
  await dropTestDatabases();
  if (stage.devConsoleApiSql) {
    try {
      await stage.devConsoleApiSql.close();
    } catch (error) {
      throw new Error('Error when releasing DevConsole stage: ' + error);
    }
  }
  if (stage.amsSql) {
    try {
      await stage.amsSql.close();
    } catch (error) {
      throw new Error('Error when releasing AMS stage: ' + error);
    }
  }
  if (stage.lmasMongo) {
    try {
      await stage.lmasMongo.close();
    } catch (error) {
      throw new Error('Error when releasing LMAS Mongo stage: ' + error);
    }
  }

  if (stage.http) {
    try {
      await stage.http.close();
    } catch (error) {
      throw new Error('Error when closing http server: ' + error);
    }
  }

  if (stage.app) {
    try {
      await stage.app.close();
    } catch (error) {
      throw new Error('Error when closing application: ' + error);
    }
  }
};

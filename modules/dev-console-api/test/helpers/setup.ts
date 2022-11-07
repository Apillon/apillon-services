import { HttpServer, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { dropTestDatabases, rebuildTestDatabases } from './migrations';
import { AppEnvironment, env, Mongo, MySql } from '@apillon/lib';
import { TestContext } from './context';
import { AppModule } from '../../src/app.module';
// import { startDevServer as startAmsServer } from 'at-ams/src/server';
// import { startDevServer as startLmasServer } from 'at-lmas/src/server';

/**
 * Testing stage definition.
 */
export interface DatabaseState {
  mysql: MySql;
}

export interface Stage {
  amsContext: TestContext;
  lmasContext: TestContext;
  devConsoleContext: TestContext;
  app: INestApplication;
  http: HttpServer;
  amsSql: MySql;
  lmasMongo: Mongo;
  devConsoleSql: MySql;
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
    await app.init();
    await app.listen(
      env.DEV_CONSOLE_API_PORT_TEST,
      env.DEV_CONSOLE_API_HOST_TEST,
    );
    http = app.getHttpServer();
    const config = {
      host: env.DEV_CONSOLE_API_MYSQL_HOST_TEST,
      database: env.DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
      password: env.DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
      port: env.DEV_CONSOLE_API_MYSQL_PORT_TEST,
      user: env.DEV_CONSOLE_API_MYSQL_USER_TEST,
    };

    const devConsoleSql = new MySql(config);
    await devConsoleSql.connect();
    const devConsoleContext = new TestContext();
    devConsoleContext.mysql = devConsoleSql;

    const config2 = {
      host: env.ACCESS_MYSQL_HOST_TEST,
      database: env.ACCESS_MYSQL_DATABASE_TEST,
      password: env.ACCESS_MYSQL_PASSWORD_TEST,
      port: env.ACCESS_MYSQL_PORT_TEST,
      user: env.ACCESS_MYSQL_USER_TEST,
    };

    const amsSql = new MySql(config2);
    await amsSql.connect();

    const amsContext = new TestContext();
    amsContext.mysql = amsSql;

    const lmasMongo = new Mongo(
      env.MONITORING_MONGO_SRV_TEST,
      env.MONITORING_MONGO_DATABASE_TEST,
      10,
    );

    const lmasContext = new TestContext();
    lmasContext.mongo = lmasMongo;

    // startAmsServer();
    // startLmasServer();

    return {
      devConsoleContext,
      amsContext,
      lmasContext,
      app,
      http,
      devConsoleSql,
      amsSql,
      lmasMongo,
    };
  } catch (e) {
    console.error(e);
    throw new Error('Unable to set up env');
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
  if (stage.devConsoleSql) {
    try {
      await stage.devConsoleSql.close();
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

import { env, Mongo, MySql } from '@apillon/lib';
import { Stage } from '../interfaces/stage.interface';
import { TestContext } from './context';
import { dropTestDatabases } from './migrations';
// import { startDevServer as startAmsServer } from 'at-ams/src/server';
// import { startDevServer as startLmasServer } from 'at-lmas/src/server';

export async function setupTestContextAndSql(): Promise<Stage> {
  try {
    //Dev-console-api context & mysql
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

    //AMS MS context
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

    //Storage MS context
    const config3 = {
      host: env.STORAGE_MYSQL_HOST_TEST,
      database: env.STORAGE_MYSQL_DATABASE_TEST,
      password: env.STORAGE_MYSQL_PASSWORD_TEST,
      port: env.STORAGE_MYSQL_PORT_TEST,
      user: env.STORAGE_MYSQL_USER_TEST,
    };

    const storageSql = new MySql(config3);
    await storageSql.connect();

    const storageContext = new TestContext();
    storageContext.mysql = storageSql;

    //Config MS context
    const config4 = {
      host: env.CONFIG_MYSQL_HOST_TEST,
      database: env.CONFIG_MYSQL_DATABASE_TEST,
      password: env.CONFIG_MYSQL_PASSWORD_TEST,
      port: env.CONFIG_MYSQL_PORT_TEST,
      user: env.CONFIG_MYSQL_USER_TEST,
    };

    const configSql = new MySql(config4);
    await configSql.connect();

    const configContext = new TestContext();
    configContext.mysql = configSql;

    //Referral MS context
    const config5 = {
      host: env.REFERRAL_MYSQL_HOST_TEST,
      database: env.REFERRAL_MYSQL_DATABASE_TEST,
      password: env.REFERRAL_MYSQL_PASSWORD_TEST,
      port: env.REFERRAL_MYSQL_PORT_TEST,
      user: env.REFERRAL_MYSQL_USER_TEST,
    };

    const referralSql = new MySql(config5);
    await referralSql.connect();

    const referralContext = new TestContext();
    referralContext.mysql = referralSql;

    // startAmsServer();
    // startLmasServer();

    return {
      http: undefined,
      app: undefined,
      devConsoleContext,
      devConsoleSql,
      amsContext,
      lmasContext,
      amsSql,
      lmasMongo,
      storageContext,
      storageSql,
      configContext,
      configSql,
      referralContext,
      referralSql,
    };
  } catch (e) {
    console.error(e);
    throw new Error('Unable to set up test conteksts and sqls');
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

  if (stage.storageSql) {
    try {
      await stage.storageSql.close();
    } catch (error) {
      throw new Error('Error when releasing Storage stage: ' + error);
    }
  }

  if (stage.configSql) {
    try {
      await stage.configSql.close();
    } catch (error) {
      throw new Error('Error when releasing Config stage: ' + error);
    }
  }

  if (stage.referralSql) {
    try {
      await stage.referralSql.close();
    } catch (error) {
      throw new Error('Error when releasing Referral stage: ' + error);
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

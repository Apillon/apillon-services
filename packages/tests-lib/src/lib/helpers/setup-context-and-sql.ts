import { env, Mongo, MySql } from '@apillon/lib';
import { Stage } from '../interfaces/stage.interface';
import { TestContext } from './context';
import { dropTestDatabases } from './migrations';
// import { startDevServer as startAmsServer } from 'at-ams/src/server';
// import { startDevServer as startLmasServer } from 'at-lmas/src/server';

export async function setupTestContextAndSql(): Promise<Stage> {
  try {
    /********************** DEV-CONSOLE APP **************************/
    const configDevConsole = {
      host: env.DEV_CONSOLE_API_MYSQL_HOST_TEST,
      database: env.DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
      password: env.DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
      port: env.DEV_CONSOLE_API_MYSQL_PORT_TEST,
      user: env.DEV_CONSOLE_API_MYSQL_USER_TEST,
    };

    const devConsoleSql = new MySql(configDevConsole);
    await devConsoleSql.connect();
    const devConsoleContext = new TestContext();
    devConsoleContext.mysql = devConsoleSql;

    /********************** AMS MS **************************/
    const accessConfig = {
      host: env.ACCESS_MYSQL_HOST_TEST,
      database: env.ACCESS_MYSQL_DATABASE_TEST,
      password: env.ACCESS_MYSQL_PASSWORD_TEST,
      port: env.ACCESS_MYSQL_PORT_TEST,
      user: env.ACCESS_MYSQL_USER_TEST,
    };

    const amsSql = new MySql(accessConfig);
    await amsSql.connect();

    const amsContext = new TestContext();
    amsContext.mysql = amsSql;

    /********************** LMAS MS **************************/

    const lmasMongo = new Mongo(
      env.MONITORING_MONGO_SRV_TEST,
      env.MONITORING_MONGO_DATABASE_TEST,
      10,
    );

    const lmasContext = new TestContext();
    lmasContext.mongo = lmasMongo;

    /********************** STORAGE MS **************************/
    const configStorageApp = {
      host: env.STORAGE_MYSQL_HOST_TEST,
      database: env.STORAGE_MYSQL_DATABASE_TEST,
      password: env.STORAGE_MYSQL_PASSWORD_TEST,
      port: env.STORAGE_MYSQL_PORT_TEST,
      user: env.STORAGE_MYSQL_USER_TEST,
    };

    const storageSql = new MySql(configStorageApp);
    await storageSql.connect();

    const storageContext = new TestContext();
    storageContext.mysql = storageSql;

    /********************** CONFIGURATION MS **************************/
    const configConfigMS = {
      host: env.CONFIG_MYSQL_HOST_TEST,
      database: env.CONFIG_MYSQL_DATABASE_TEST,
      password: env.CONFIG_MYSQL_PASSWORD_TEST,
      port: env.CONFIG_MYSQL_PORT_TEST,
      user: env.CONFIG_MYSQL_USER_TEST,
    };

    const configSql = new MySql(configConfigMS);
    await configSql.connect();

    const configContext = new TestContext();
    configContext.mysql = configSql;

    /********************** AUTHENTICATION APP **************************/
    const authApiConfig = {
      host: env.AUTH_API_MYSQL_HOST_TEST,
      database: env.AUTH_API_MYSQL_DATABASE_TEST,
      password: env.AUTH_API_MYSQL_PASSWORD_TEST,
      port: env.AUTH_API_MYSQL_PORT_TEST,
      user: env.AUTH_API_MYSQL_USER_TEST,
    };

    const authApiSql = new MySql(authApiConfig);
    await authApiSql.connect();

    const authApiContext = new TestContext();
    authApiContext.mysql = authApiSql;

    /********************** REFERRAL MS **************************/
    const referralConfig = {
      host: env.REFERRAL_MYSQL_HOST_TEST,
      database: env.REFERRAL_MYSQL_DATABASE_TEST,
      password: env.REFERRAL_MYSQL_PASSWORD_TEST,
      port: env.REFERRAL_MYSQL_PORT_TEST,
      user: env.REFERRAL_MYSQL_USER_TEST,
    };

    const referralSql = new MySql(referralConfig);
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
      authApiContext,
      authApiSql,
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

  if (stage.authApiSql) {
    try {
      await stage.authApiSql.close();
    } catch (error) {
      throw new Error('Error when releasing Auth stage: ' + error);
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

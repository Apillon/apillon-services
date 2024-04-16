import { env, Mongo, MySql } from '@apillon/lib';
import { ServiceObject, Stage } from '../interfaces/stage.interface';
import { TestContext } from './context';
import { dropTestDatabases } from './migrations';
import { ConnectionOptions } from 'mysql2';
// import { startDevServer as startAmsServer } from 'at-ams/src/server';
// import { startDevServer as startLmasServer } from 'at-lmas/src/server';

const SQL_CONFIGS: ServiceObject<ConnectionOptions> = {
  devConsole: {
    host: env.DEV_CONSOLE_API_MYSQL_HOST_TEST,
    database: env.DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
    password: env.DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
    port: env.DEV_CONSOLE_API_MYSQL_PORT_TEST,
    user: env.DEV_CONSOLE_API_MYSQL_USER_TEST,
  },
  ams: {
    host: env.ACCESS_MYSQL_HOST_TEST,
    database: env.ACCESS_MYSQL_DATABASE_TEST,
    password: env.ACCESS_MYSQL_PASSWORD_TEST,
    port: env.ACCESS_MYSQL_PORT_TEST,
    user: env.ACCESS_MYSQL_USER_TEST,
  },
  storage: {
    host: env.STORAGE_MYSQL_HOST_TEST,
    database: env.STORAGE_MYSQL_DATABASE_TEST,
    password: env.STORAGE_MYSQL_PASSWORD_TEST,
    port: env.STORAGE_MYSQL_PORT_TEST,
    user: env.STORAGE_MYSQL_USER_TEST,
  },
  config: {
    host: env.CONFIG_MYSQL_HOST_TEST,
    database: env.CONFIG_MYSQL_DATABASE_TEST,
    password: env.CONFIG_MYSQL_PASSWORD_TEST,
    port: env.CONFIG_MYSQL_PORT_TEST,
    user: env.CONFIG_MYSQL_USER_TEST,
  },
  authApi: {
    host: env.AUTH_API_MYSQL_HOST_TEST,
    database: env.AUTH_API_MYSQL_DATABASE_TEST,
    password: env.AUTH_API_MYSQL_PASSWORD_TEST,
    port: env.AUTH_API_MYSQL_PORT_TEST,
    user: env.AUTH_API_MYSQL_USER_TEST,
  },
  referral: {
    host: env.REFERRAL_MYSQL_HOST_TEST,
    database: env.REFERRAL_MYSQL_DATABASE_TEST,
    password: env.REFERRAL_MYSQL_PASSWORD_TEST,
    port: env.REFERRAL_MYSQL_PORT_TEST,
    user: env.REFERRAL_MYSQL_USER_TEST,
  },
  nfts: {
    host: env.NFTS_MYSQL_HOST_TEST,
    database: env.NFTS_MYSQL_DATABASE_TEST,
    password: env.NFTS_MYSQL_PASSWORD_TEST,
    port: env.NFTS_MYSQL_PORT_TEST,
    user: env.NFTS_MYSQL_USER_TEST,
  },
  blockchain: {
    host: env.BLOCKCHAIN_MYSQL_HOST_TEST,
    database: env.BLOCKCHAIN_MYSQL_DATABASE_TEST,
    password: env.BLOCKCHAIN_MYSQL_PASSWORD_TEST,
    port: env.BLOCKCHAIN_MYSQL_PORT_TEST,
    user: env.BLOCKCHAIN_MYSQL_USER_TEST,
  },
  social: {
    host: env.SOCIAL_MYSQL_HOST_TEST,
    database: env.SOCIAL_MYSQL_DATABASE_TEST,
    password: env.SOCIAL_MYSQL_PASSWORD_TEST,
    port: env.SOCIAL_MYSQL_PORT_TEST,
    user: env.SOCIAL_MYSQL_USER_TEST,
  },
  computing: {
    host: env.COMPUTING_MYSQL_HOST_TEST,
    database: env.COMPUTING_MYSQL_DATABASE_TEST,
    password: env.COMPUTING_MYSQL_PASSWORD_TEST,
    port: env.COMPUTING_MYSQL_PORT_TEST,
    user: env.COMPUTING_MYSQL_USER_TEST,
  },
};

async function createServiceContext(config: ConnectionOptions) {
  const mysql = new MySql(config);
  await mysql.connect();
  const ctx = new TestContext();
  ctx.mysql = mysql;
  return ctx;
}

export async function setupTestContextAndSql(): Promise<Stage> {
  try {
    const lmasMongo = new Mongo(
      env.MONITORING_MONGO_SRV_TEST,
      env.MONITORING_MONGO_DATABASE_TEST,
      10,
    );
    await lmasMongo.connect();

    const lmasContext = new TestContext();
    lmasContext.mongo = lmasMongo;

    // init contexts and SQL
    const sql = {};
    const context: Partial<ServiceObject<TestContext>> = {};
    for (const [serviceName, config] of Object.entries(SQL_CONFIGS)) {
      const ctx = await createServiceContext(config);
      context[serviceName] = ctx;
      sql[serviceName] = ctx.mysql;
    }

    return {
      http: undefined,
      app: undefined,
      lmasMongo,
      lmasContext,
      devConsoleContext: context.devConsole,
      amsContext: context.ams,
      storageContext: context.storage,
      configContext: context.config,
      authApiContext: context.authApi,
      referralContext: context.referral,
      nftsContext: context.nfts,
      blockchainContext: context.blockchain,
      socialContext: context.social,
      computingContext: context.computing,
      sql: sql as ServiceObject<MySql>,
    };
  } catch (e) {
    console.error(e);
    throw new Error(`Unable to set up test contexts and SQLs: ${e}`);
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

  try {
    await dropTestDatabases();
  } catch (err) {
    console.error('Error dropTestDatabases', err);
  }

  // close SQL connections
  const closeSqlErrors = [];
  for (const [serviceName, sql] of Object.entries(stage.sql)) {
    try {
      await sql.close();
    } catch (error) {
      closeSqlErrors.push(serviceName);
    }
  }
  if (closeSqlErrors.length > 0) {
    throw new Error(
      'Error when releasing stages: ' + closeSqlErrors.join(', '),
    );
  }
};

import { AppEnvironment, env, MySql } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { rebuildTestDatabases, dropTestDatabases } from '@apillon/tests-lib';

export interface Stage {
  db: MySql;
  context: ServiceContext;
  storageContext: ServiceContext;
}

export async function setupTest(): Promise<Stage> {
  env.APP_ENV = AppEnvironment.TEST;

  env.DEPLOY_MYSQL_HOST = null; // safety
  env.STORAGE_MYSQL_HOST = null; // safety

  const config = {
    host: env.DEPLOY_MYSQL_HOST_TEST,
    database: env.DEPLOY_MYSQL_DATABASE_TEST,
    password: env.DEPLOY_MYSQL_PASSWORD_TEST,
    port: env.DEPLOY_MYSQL_PORT_TEST,
    user: env.DEPLOY_MYSQL_USER_TEST,
  };

  const storageConfig = {
    host: env.STORAGE_MYSQL_HOST_TEST,
    database: env.STORAGE_MYSQL_DATABASE_TEST,
    password: env.STORAGE_MYSQL_PASSWORD_TEST,
    port: env.STORAGE_MYSQL_PORT_TEST,
    user: env.STORAGE_MYSQL_USER_TEST,
  };

  try {
    await rebuildTestDatabases();
    const db = new MySql(config);
    await db.connect();
    const context = new ServiceContext();
    context.mysql = db;

    const storageDb = new MySql(storageConfig);
    await storageDb.connect();
    const storageContext = new ServiceContext();
    storageContext.mysql = storageDb;

    return {
      db,
      context,
      storageContext,
    };
  } catch (e) {
    console.error(e);
    throw new Error('Unable to set up env');
  }
}

/**
 * Releases initialized stage - drops DB and closes SQL connection
 *
 * @param stage Stage with connected DB instance and context instance.
 */
export const releaseStage = async (stage: Stage): Promise<void> => {
  if (!stage) {
    throw new Error('Error - stage does not exist');
  }

  await dropTestDatabases();

  if (stage.db) {
    try {
      await stage.db.close();
      await stage.storageContext.mysql.close();
    } catch (error) {
      throw new Error(`Error when releasing database: ${error}`);
    }
  }
};

import {
  AppEnvironment,
  dropDatabase,
  env,
  Mongo,
  MySql,
  rebuildDatabase,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';

/**
 * Testing stage definition.
 */
export interface DatabaseState {
  mysql: MySql;
}

export interface Stage {
  db: MySql;
  context: ServiceContext;
  lmasMongo: Mongo;
}

export async function setupTest(): Promise<Stage> {
  env.APP_ENV = AppEnvironment.TEST;

  env.STORAGE_MYSQL_HOST = null; // safety

  try {
    await rebuildDatabase(
      env.STORAGE_MYSQL_DATABASE_TEST,
      env.STORAGE_MYSQL_HOST_TEST,
      env.STORAGE_MYSQL_PORT_TEST,
      env.STORAGE_MYSQL_USER_TEST,
      env.STORAGE_MYSQL_PASSWORD_TEST,
    );

    const config = {
      host: env.STORAGE_MYSQL_HOST_TEST,
      database: env.STORAGE_MYSQL_DATABASE_TEST,
      password: env.STORAGE_MYSQL_PASSWORD_TEST,
      port: env.STORAGE_MYSQL_PORT_TEST,
      user: env.STORAGE_MYSQL_USER_TEST,
    };

    const db = new MySql(config);
    await db.connect();
    const context = new ServiceContext();
    context.mysql = db;

    const lmasMongo = new Mongo(
      env.MONITORING_MONGO_SRV_TEST,
      env.MONITORING_MONGO_DATABASE_TEST,
      10,
    );
    await lmasMongo.connect();

    return {
      db,
      context,
      lmasMongo,
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

  await dropDatabase(
    env.STORAGE_MYSQL_DATABASE_TEST,
    env.STORAGE_MYSQL_HOST_TEST,
    env.STORAGE_MYSQL_PORT_TEST,
    env.STORAGE_MYSQL_USER_TEST,
    env.STORAGE_MYSQL_PASSWORD_TEST,
  );

  if (stage.db) {
    try {
      await stage.db.close();
    } catch (error) {
      throw new Error('Error when releasing database: ' + error);
    }
  }
};

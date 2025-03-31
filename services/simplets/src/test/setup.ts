import {
  AppEnvironment,
  dropDatabase,
  env,
  MySql,
  rebuildDatabase,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';

export interface Stage {
  db: MySql;
  context: ServiceContext;
}

export async function setupTest(): Promise<Stage> {
  env.APP_ENV = AppEnvironment.TEST;

  env.SIMPLETS_MYSQL_HOST = null; // safety

  try {
    await rebuildDatabase(
      env.SIMPLETS_MYSQL_DATABASE_TEST,
      env.SIMPLETS_MYSQL_HOST_TEST,
      env.SIMPLETS_MYSQL_PORT_TEST,
      env.SIMPLETS_MYSQL_USER_TEST,
      env.SIMPLETS_MYSQL_PASSWORD_TEST,
    );

    // await seedDatabase(
    //   env.SIMPLETS_MYSQL_DATABASE_TEST,
    //   env.SIMPLETS_MYSQL_HOST_TEST,
    //   env.SIMPLETS_MYSQL_PORT_TEST,
    //   env.SIMPLETS_MYSQL_USER_TEST,
    //   env.SIMPLETS_MYSQL_PASSWORD_TEST,
    // );
    const config = {
      host: env.SIMPLETS_MYSQL_HOST_TEST,
      database: env.SIMPLETS_MYSQL_DATABASE_TEST,
      password: env.SIMPLETS_MYSQL_PASSWORD_TEST,
      port: env.SIMPLETS_MYSQL_PORT_TEST,
      user: env.SIMPLETS_MYSQL_USER_TEST,
    };

    const db = new MySql(config);
    await db.connect();
    const context = new ServiceContext();
    context.mysql = db;

    return {
      db,
      context,
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
    env.SIMPLETS_MYSQL_DATABASE_TEST,
    env.SIMPLETS_MYSQL_HOST_TEST,
    env.SIMPLETS_MYSQL_PORT_TEST,
    env.SIMPLETS_MYSQL_USER_TEST,
    env.SIMPLETS_MYSQL_PASSWORD_TEST,
  );

  if (stage.db) {
    try {
      await stage.db.close();
    } catch (error) {
      throw new Error('Error when releasing database: ' + error);
    }
  }
};

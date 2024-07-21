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

  env.CONTRACTS_MYSQL_HOST = null; // safety

  try {
    await rebuildDatabase(
      env.CONTRACTS_MYSQL_DATABASE_TEST,
      env.CONTRACTS_MYSQL_HOST_TEST,
      env.CONTRACTS_MYSQL_PORT_TEST,
      env.CONTRACTS_MYSQL_USER_TEST,
      env.CONTRACTS_MYSQL_PASSWORD_TEST,
    );

    // await seedDatabase(
    //   env.CONTRACTS_MYSQL_DATABASE_TEST,
    //   env.CONTRACTS_MYSQL_HOST_TEST,
    //   env.CONTRACTS_MYSQL_PORT_TEST,
    //   env.CONTRACTS_MYSQL_USER_TEST,
    //   env.CONTRACTS_MYSQL_PASSWORD_TEST,
    // );
    const config = {
      host: env.CONTRACTS_MYSQL_HOST_TEST,
      database: env.CONTRACTS_MYSQL_DATABASE_TEST,
      password: env.CONTRACTS_MYSQL_PASSWORD_TEST,
      port: env.CONTRACTS_MYSQL_PORT_TEST,
      user: env.CONTRACTS_MYSQL_USER_TEST,
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
    env.CONTRACTS_MYSQL_DATABASE_TEST,
    env.CONTRACTS_MYSQL_HOST_TEST,
    env.CONTRACTS_MYSQL_PORT_TEST,
    env.CONTRACTS_MYSQL_USER_TEST,
    env.CONTRACTS_MYSQL_PASSWORD_TEST,
  );

  if (stage.db) {
    try {
      await stage.db.close();
    } catch (error) {
      throw new Error('Error when releasing database: ' + error);
    }
  }
};

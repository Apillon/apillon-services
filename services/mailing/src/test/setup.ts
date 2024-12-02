import { AppEnvironment, env, MySql } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { rebuildTestDatabases, dropTestDatabases } from '@apillon/tests-lib';

export interface Stage {
  db: MySql;
  context: ServiceContext;
}

export async function setupTest(): Promise<Stage> {
  env.APP_ENV = AppEnvironment.TEST;

  env.MAILING_MYSQL_HOST = ''; // safety

  const config = {
    host: env.MAILING_MYSQL_HOST_TEST,
    database: env.MAILING_MYSQL_DATABASE_TEST,
    password: env.MAILING_MYSQL_PASSWORD_TEST,
    port: env.MAILING_MYSQL_PORT_TEST,
    user: env.MAILING_MYSQL_USER_TEST,
  };

  try {
    await rebuildTestDatabases();
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

  await dropTestDatabases();

  if (stage.db) {
    try {
      await stage.db.close();
    } catch (error) {
      throw new Error(`Error when releasing database: ${error}`);
    }
  }
};

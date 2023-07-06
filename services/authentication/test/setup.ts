import { AppEnvironment, dropDatabase, env, MySql } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { rebuildTestDatabases } from '@apillon/tests-lib';

export interface Stage {
  authApiContext: ServiceContext;
}

export async function setupTest(): Promise<Stage> {
  env.APP_ENV = AppEnvironment.TEST;

  env.AUTH_API_MYSQL_HOST_TEST = null;

  try {
    // TODO: Just rebuild the databases you want....
    await rebuildTestDatabases();

    const configAuthApi = {
      host: env.AUTH_API_MYSQL_HOST_TEST,
      database: env.AUTH_API_MYSQL_DATABASE_TEST,
      password: env.AUTH_API_MYSQL_PASSWORD_TEST,
      port: env.AUTH_API_MYSQL_PORT_TEST,
      user: env.AUTH_API_MYSQL_USER_TEST,
    };

    const dbAuthApiSql = new MySql(configAuthApi);
    await dbAuthApiSql.connect();
    const authApiContext = new ServiceContext();
    authApiContext.mysql = dbAuthApiSql;

    return {
      authApiContext,
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
    env.AUTH_API_MYSQL_DATABASE_TEST,
    env.AUTH_API_MYSQL_HOST_TEST,
    env.AUTH_API_MYSQL_PORT_TEST,
    env.AUTH_API_MYSQL_USER_TEST,
    env.AUTH_API_MYSQL_PASSWORD_TEST,
  );

  if (stage.authApiContext.mysql) {
    try {
      await stage.authApiContext.mysql.close();
    } catch (error) {
      throw new Error('Error when releasing database: ' + error);
    }
  }
};

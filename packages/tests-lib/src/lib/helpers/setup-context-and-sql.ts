import { env, Mongo, MySql } from '@apillon/lib';
import { StageObject, Stage } from '../interfaces/stage.interface';
import { TestContext } from './context';
import { dropTestDatabases, SQL_CONFIGS } from './migrations';
// import { startDevServer as startAmsServer } from 'at-ams/src/server';
// import { startDevServer as startLmasServer } from 'at-lmas/src/server';

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
    const databases = {};
    const contexts: Partial<StageObject<TestContext>> = {};
    for (const [serviceName, config] of Object.entries(SQL_CONFIGS)) {
      const database = new MySql(config);
      await database.connect();
      databases[serviceName] = database;

      const context = new TestContext();
      context.mysql = database;
      contexts[serviceName] = context;
    }

    return {
      http: undefined,
      app: undefined,
      lmasMongo,
      lmasContext,
      devConsoleContext: contexts.devConsole,
      amsContext: contexts.access,
      storageContext: contexts.storage,
      configContext: contexts.config,
      authApiContext: contexts.authentication,
      referralContext: contexts.referral,
      nftsContext: contexts.nfts,
      blockchainContext: contexts.blockchain,
      socialContext: contexts.social,
      computingContext: contexts.computing,
      db: databases as StageObject<MySql>,
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
  const errors = [];
  for (const [serviceName, sql] of Object.entries(stage.db)) {
    try {
      await sql.close();
    } catch (error) {
      errors.push(serviceName);
    }
  }
  if (errors.length > 0) {
    console.error('Error when releasing stages: ' + errors.join(',\n'));
  }
};

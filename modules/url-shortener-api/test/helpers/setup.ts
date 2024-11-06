import { AppEnvironment, env } from '@apillon/lib';

import {
  Stage,
  rebuildTestDatabases,
  setupTestContextAndSql,
} from '@apillon/tests-lib';

/**
 * Setup test environment. Rebuild DB.
 * @returns
 */
export async function setupTest(): Promise<Stage> {
  env.APP_ENV = AppEnvironment.TEST;

  env.DEV_CONSOLE_API_MYSQL_HOST = null; // safety
  env.ACCESS_MYSQL_HOST = null; // safety
  env.STORAGE_MYSQL_HOST = null; // safety
  env.CONFIG_MYSQL_HOST = null; // safety
  env.REFERRAL_MYSQL_HOST = null; // safety
  env.NFTS_MYSQL_HOST = null; // safety
  env.AUTH_API_MYSQL_HOST = null; // safety
  env.BLOCKCHAIN_MYSQL_HOST = null; // safety
  env.SOCIAL_MYSQL_HOST = null; // safety
  env.INFRASTRUCTURE_MYSQL_HOST = null;

  try {
    await rebuildTestDatabases();
  } catch (err) {
    console.error(err);
    throw new Error(`rebuildTestDatabases failed: ${err}`);
  }

  try {
    return await setupTestContextAndSql();
  } catch (e) {
    console.error(e);
    throw new Error(`Unable to set up env: ${e}`);
  }
}

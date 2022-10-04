import { Migration, MigrationConnection } from 'ts-mysql-migrate';
import { ConnectionOptions, createPool } from 'mysql2';
import { AppEnvironment, env } from 'at-lib';

let dbConsoleMigration: Migration = null;
let dbAmsMigration: Migration = null;

export async function setupTestDatabase(): Promise<void> {
  await upgradeTestDatabases();
}
async function initMigrations() {
  if (!dbConsoleMigration) {
    await initDevConsoleTestMigrations();
  }
  if (!dbAmsMigration) {
    await initAmsTestMigrations();
  }
}
export async function upgradeTestDatabases(): Promise<void> {
  await initMigrations();
  await Promise.all([dbAmsMigration.up(), dbConsoleMigration.up()]);
  await destroyTestMigrations();
}

export async function downgradeTestDatabases(): Promise<void> {
  await initMigrations();
  await Promise.all([dbAmsMigration.down(-1), dbConsoleMigration.down(-1)]);
  await destroyTestMigrations();
}

export async function clearTestDatabases(): Promise<void> {
  await rebuildTestDatabases();
}

export async function destroyTestMigrations(): Promise<void> {
  const promises = [];
  if (dbConsoleMigration) {
    promises.push(dbConsoleMigration.destroy());
  }
  if (dbAmsMigration) {
    promises.push(dbAmsMigration.destroy());
  }
  await Promise.all(promises);
  dbConsoleMigration = null;
  dbAmsMigration = null;
}

export async function rebuildTestDatabases(): Promise<void> {
  await initMigrations();
  await Promise.all([dbAmsMigration.reset(), dbConsoleMigration.reset()]);
  await destroyTestMigrations();
}

export async function dropTestDatabases(): Promise<void> {
  await downgradeTestDatabases();
  await destroyTestMigrations();
}

async function initDevConsoleTestMigrations() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolConfig: ConnectionOptions = {
    host: env.AT_DEV_CONSOLE_API_MYSQL_HOST_TEST,
    database: env.AT_DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
    password: env.AT_DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
    port: env.AT_DEV_CONSOLE_API_MYSQL_PORT_TEST,
    user: env.AT_DEV_CONSOLE_API_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolConfig.database)) {
    throw new Error('!!! NOT TEST DATABASE? !!!');
  }

  const pool = createPool(poolConfig);

  dbConsoleMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'migrations',
    dir: './/dev-console-migrations/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbConsoleMigration.initialize();
}

async function initAmsTestMigrations() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolConfig: ConnectionOptions = {
    host: env.AT_AMS_MYSQL_HOST_TEST,
    database: env.AT_AMS_MYSQL_DATABASE_TEST,
    password: env.AT_AMS_MYSQL_PASSWORD_TEST,
    port: env.AT_AMS_MYSQL_PORT_TEST,
    user: env.AT_AMS_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolConfig.database)) {
    throw new Error('!!! NOT TEST DATABASE? !!!');
  }

  const pool = createPool(poolConfig);

  dbAmsMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'migrations',
    dir: './/ams-migrations/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbAmsMigration.initialize();
}

import { Migration, MigrationConnection } from 'ts-mysql-migrate';
import { ConnectionOptions, createPool } from 'mysql2';
import { AppEnvironment, env } from '@apillon/lib';

let dbConsoleMigration: Migration = null;
let dbAmsMigration: Migration = null;
let dbConsoleSeed: Migration = null;
let dbAmsSeed: Migration = null;
let dbStorageMigration: Migration = null;

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

  if (!dbStorageMigration) {
    await initStorageTestMigrations();
  }
}

async function initSeeds() {
  if (!dbConsoleSeed) {
    await initDevConsoleTestSeed();
  }
  if (!dbAmsSeed) {
    await initAmsTestSeed();
  }
}

export async function upgradeTestDatabases(): Promise<void> {
  await initMigrations();
  await Promise.all([
    dbAmsMigration.up(),
    dbConsoleMigration.up(),
    dbStorageMigration.up(),
  ]);
  await destroyTestMigrations();
}

export async function downgradeTestDatabases(): Promise<void> {
  await initMigrations();
  await Promise.all([
    dbAmsMigration.down(-1),
    dbConsoleMigration.down(-1),
    dbStorageMigration.down(-1),
  ]);
  await destroyTestMigrations();
}

export async function seedTestDatabases(): Promise<void> {
  await initSeeds();
  await Promise.all([dbAmsSeed.up(), dbConsoleSeed.up()]);
  await destroyTestSeeds();
}

export async function unseedTestDatabases(): Promise<void> {
  await initSeeds();
  await Promise.all([dbAmsSeed.down(-1), dbConsoleSeed.down(-1)]);
  await destroyTestSeeds();
}

export async function destroyTestMigrations(): Promise<void> {
  const promises = [];
  if (dbConsoleMigration) {
    promises.push(dbConsoleMigration.destroy());
  }
  if (dbAmsMigration) {
    promises.push(dbAmsMigration.destroy());
  }
  if (dbStorageMigration) {
    promises.push(dbStorageMigration.destroy());
  }
  await Promise.all(promises);
  dbConsoleMigration = null;
  dbAmsMigration = null;
  dbStorageMigration = null;
}

export async function destroyTestSeeds(): Promise<void> {
  const promises = [];
  if (dbConsoleSeed) {
    promises.push(dbConsoleSeed.destroy());
  }
  if (dbAmsSeed) {
    promises.push(dbAmsSeed.destroy());
  }
  await Promise.all(promises);
  dbConsoleSeed = null;
  dbAmsSeed = null;
}

export async function rebuildTestDatabases(): Promise<void> {
  await initMigrations();
  await Promise.all([
    dbAmsMigration.reset(),
    dbConsoleMigration.reset(),
    dbStorageMigration.reset(),
  ]);
  await destroyTestMigrations();
  await initSeeds();
  await Promise.all([dbAmsSeed.reset(), dbConsoleSeed.reset()]);
  await destroyTestSeeds();
}

export async function dropTestDatabases(): Promise<void> {
  await downgradeTestDatabases();
  await destroyTestMigrations();
}

async function initDevConsoleTestMigrations() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolConfig: ConnectionOptions = {
    host: env.DEV_CONSOLE_API_MYSQL_HOST_TEST,
    database: env.DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
    password: env.DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
    port: env.DEV_CONSOLE_API_MYSQL_PORT_TEST,
    user: env.DEV_CONSOLE_API_MYSQL_USER_TEST,
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
    dir: './/src/migration-scripts/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbConsoleMigration.initialize();
}

async function initAmsTestMigrations() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolConfig: ConnectionOptions = {
    host: env.ACCESS_MYSQL_HOST_TEST,
    database: env.ACCESS_MYSQL_DATABASE_TEST,
    password: env.ACCESS_MYSQL_PASSWORD_TEST,
    port: env.ACCESS_MYSQL_PORT_TEST,
    user: env.ACCESS_MYSQL_USER_TEST,
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
    dir: '../../services/access/src/migration-scripts/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbAmsMigration.initialize();
}

async function initDevConsoleTestSeed() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolConfig: ConnectionOptions = {
    host: env.DEV_CONSOLE_API_MYSQL_HOST_TEST,
    database: env.DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
    password: env.DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
    port: env.DEV_CONSOLE_API_MYSQL_PORT_TEST,
    user: env.DEV_CONSOLE_API_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolConfig.database)) {
    throw new Error('!!! NOT TEST DATABASE? !!!');
  }

  const pool = createPool(poolConfig);

  dbConsoleSeed = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'seeds',
    dir: './/src/migration-scripts/seeds',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbConsoleSeed.initialize();
}

async function initStorageTestMigrations() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolConfig: ConnectionOptions = {
    host: env.STORAGE_MYSQL_HOST_TEST,
    database: env.STORAGE_MYSQL_DATABASE_TEST,
    password: env.STORAGE_MYSQL_PASSWORD_TEST,
    port: env.STORAGE_MYSQL_PORT_TEST,
    user: env.STORAGE_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolConfig.database)) {
    throw new Error('!!! NOT TEST DATABASE? !!!');
  }

  const pool = createPool(poolConfig);

  dbStorageMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'migrations',
    dir: '../../services/storage/src/migration-scripts/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbStorageMigration.initialize();
}

async function initAmsTestSeed() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolConfig: ConnectionOptions = {
    host: env.ACCESS_MYSQL_HOST_TEST,
    database: env.ACCESS_MYSQL_DATABASE_TEST,
    password: env.ACCESS_MYSQL_PASSWORD_TEST,
    port: env.ACCESS_MYSQL_PORT_TEST,
    user: env.ACCESS_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolConfig.database)) {
    throw new Error('!!! NOT TEST DATABASE? !!!');
  }

  const pool = createPool(poolConfig);

  dbAmsSeed = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'seeds',
    dir: '../../services/access/src/migration-scripts/seeds',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbAmsSeed.initialize();
}

import { Migration, MigrationConnection } from 'ts-mysql-migrate';
import { ConnectionOptions, createPool } from 'mysql2';
import { AppEnvironment, env } from '@apillon/lib';

let dbAuthApiMigration: Migration = null;
let dbAuthApiMigrationSeed: Migration = null;
let dbConfigMigration: Migration = null;
let dbConfigSeed: Migration = null;

export async function setupTestDatabase(): Promise<void> {
  await upgradeTestDatabases();
}
async function initMigrations() {
  if (!dbAuthApiMigration) {
    await initAuthApiTestMigrations();
  }

  if (!dbConfigMigration) {
    await initConfigTestMigrations();
  }
}

async function initSeeds() {
  if (!dbAuthApiMigrationSeed) {
    await initAuthApiTestSeed();
  }
  if (!dbConfigSeed) {
    await initConfigTestSeed();
  }
}

export async function upgradeTestDatabases(): Promise<void> {
  await initMigrations();
  await Promise.all([dbAuthApiMigration.up(), dbConfigMigration.up()]);
  await destroyTestMigrations();
}

export async function downgradeTestDatabases(): Promise<void> {
  await initMigrations();
  await Promise.all([dbAuthApiMigration.down(-1), dbConfigMigration.down(-1)]);
  await destroyTestMigrations();
}

export async function seedTestDatabases(): Promise<void> {
  await initSeeds();
  await Promise.all([dbAuthApiMigrationSeed.up(), dbConfigSeed.up()]);
  await destroyTestSeeds();
}

export async function unseedTestDatabases(): Promise<void> {
  await initSeeds();
  await Promise.all([dbAuthApiMigrationSeed.down(-1), dbConfigSeed.down(-1)]);
  await destroyTestSeeds();
}

export async function destroyTestMigrations(): Promise<void> {
  const promises = [];
  if (dbAuthApiMigration) {
    promises.push(dbAuthApiMigration.destroy());
  }
  if (dbConfigMigration) {
    promises.push(dbConfigMigration.destroy());
  }
  await Promise.all(promises);
  dbAuthApiMigration = null;
  dbConfigMigration = null;
}

export async function destroyTestSeeds(): Promise<void> {
  const promises = [];
  if (dbAuthApiMigrationSeed) {
    promises.push(dbAuthApiMigrationSeed.destroy());
  }
  if (dbConfigSeed) {
    promises.push(dbConfigSeed.destroy());
  }
  await Promise.all(promises);
  dbAuthApiMigrationSeed = null;
  dbConfigSeed = null;
}

export async function rebuildTestDatabases(): Promise<void> {
  await initMigrations();
  await Promise.all([dbConfigMigration.reset(), dbConfigMigration.reset()]);
  await destroyTestMigrations();
  await initSeeds();
  await Promise.all([dbConfigSeed.reset(), dbConfigSeed.reset()]);
  await destroyTestSeeds();
}

export async function dropTestDatabases(): Promise<void> {
  await downgradeTestDatabases();
  await destroyTestMigrations();
}

async function initConfigTestMigrations() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolConfig: ConnectionOptions = {
    host: env.CONFIG_MYSQL_HOST_TEST,
    database: env.CONFIG_MYSQL_DATABASE_TEST,
    password: env.CONFIG_MYSQL_PASSWORD_TEST,
    port: env.CONFIG_MYSQL_PORT_TEST,
    user: env.CONFIG_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolConfig.database)) {
    throw new Error('!!! NOT TEST DATABASE? !!!');
  }

  const pool = createPool(poolConfig);

  dbConfigMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'migrations',
    dir: '../../services/config/src/migration-scripts/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbConfigMigration.initialize();
}

async function initAuthApiTestMigrations() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolAuthApi: ConnectionOptions = {
    host: env.AUTH_API_MYSQL_HOST_TEST,
    database: env.AUTH_API_MYSQL_DATABASE_TEST,
    password: env.AUTH_API_MYSQL_PASSWORD_TEST,
    port: env.AUTH_API_MYSQL_PORT_TEST,
    user: env.AUTH_API_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolAuthApi.database)) {
    console.log('HERE3');
    throw new Error('!!! NOT TEST DATABASE? !!!');
  }

  const pool = createPool(poolAuthApi);

  dbAuthApiMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'migrations',
    dir: '../../services/config/src/migration-scripts/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbAuthApiMigration.initialize();
}

async function initConfigTestSeed() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolConfig: ConnectionOptions = {
    host: env.CONFIG_MYSQL_HOST_TEST,
    database: env.CONFIG_MYSQL_DATABASE_TEST,
    password: env.CONFIG_MYSQL_PASSWORD_TEST,
    port: env.CONFIG_MYSQL_PORT_TEST,
    user: env.CONFIG_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolConfig.database)) {
    console.log('HERE1');
    throw new Error('!!! NOT TEST DATABASE? !!!');
  }

  const pool = createPool(poolConfig);

  dbConfigSeed = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'seeds',
    dir: '../../services/config/src/migration-scripts/seeds',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbConfigSeed.initialize();
}

async function initAuthApiTestSeed() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolAuthApi: ConnectionOptions = {
    host: env.AUTH_API_MYSQL_HOST_TEST,
    database: env.AUTH_API_MYSQL_DATABASE_TEST,
    password: env.AUTH_API_MYSQL_PASSWORD_TEST,
    port: env.AUTH_API_MYSQL_PORT_TEST,
    user: env.AUTH_API_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolAuthApi.database)) {
    console.log('HERE2');
    throw new Error('!!! NOT TEST DATABASE? !!!');
  }

  const pool = createPool(poolAuthApi);

  dbAuthApiMigrationSeed = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'seeds',
    dir: '../../services/config/src/migration-scripts/seeds',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbAuthApiMigrationSeed.initialize();
}

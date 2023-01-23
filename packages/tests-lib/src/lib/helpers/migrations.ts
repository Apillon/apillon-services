import { Migration, MigrationConnection } from 'ts-mysql-migrate';
import { ConnectionOptions, createPool } from 'mysql2';
import { AppEnvironment, env } from '@apillon/lib';

let dbConsoleMigration: Migration = null;
let dbAmsMigration: Migration = null;
let dbConsoleSeed: Migration = null;
let dbAmsSeed: Migration = null;
let dbStorageMigration: Migration = null;
// let dbStorageSeed: Migration = null;
let dbConfigMigration: Migration = null;
let dbConfigSeed: Migration = null;
let dbAuthApiMigration: Migration = null;
let dbReferralMigration: Migration = null;

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

  if (!dbConfigMigration) {
    await initConfigTestMigrations();
  }

  if (!dbAuthApiMigration) {
    await initAuthApiTestMigrations();
  }

  if (!dbReferralMigration) {
    await initReferralTestMigrations();
  }
}

async function initSeeds() {
  if (!dbConsoleSeed) {
    await initDevConsoleTestSeed();
  }
  if (!dbAmsSeed) {
    await initAmsTestSeed();
  }
  // if (!dbStorageSeed) {
  //   await initStorageTestSeed();
  // }
  if (!dbConfigSeed) {
    await initConfigTestSeed();
  }
}

export async function upgradeTestDatabases(): Promise<void> {
  await initMigrations();
  try {
    await Promise.all([
      dbAmsMigration.up(),
      dbConsoleMigration.up(),
      dbStorageMigration.up(),
      dbConfigMigration.up(),
      dbAuthApiMigration.up(),
      dbReferralMigration.up(),
    ]);
  } catch (err) {
    console.error('error at migrations.up()', err);
    throw err;
  }
    
  await destroyTestMigrations();
}

export async function downgradeTestDatabases(): Promise<void> {
  await initMigrations();
  await Promise.all([
    dbAmsMigration.down(-1),
    dbConsoleMigration.down(-1),
    dbStorageMigration.down(-1),
    dbConfigMigration.down(-1),
    dbAuthApiMigration.down(-1),
    dbReferralMigration.down(-1),
  ]);
  await destroyTestMigrations();
}

export async function seedTestDatabases(): Promise<void> {
  await initSeeds();
  try {
    await Promise.all([
      dbAmsSeed.up(),
      dbConsoleSeed.up(),
      // dbStorageSeed.up(),
      dbConfigSeed.up(),
    ]);
  } catch (err) {
    console.error('error at seeds.up()', err);
    throw err;
  }
  await destroyTestSeeds();
}

export async function unseedTestDatabases(): Promise<void> {
  await initSeeds();
  await Promise.all([
    dbAmsSeed.down(-1),
    dbConsoleSeed.down(-1),
    // dbStorageSeed.down(-1),
    dbConfigSeed.down(-1),
  ]);
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
  if (dbConfigMigration) {
    promises.push(dbConfigMigration.destroy());
  }
  if (dbAuthApiMigration) {
    promises.push(dbAuthApiMigration.destroy());
  }
  if (dbReferralMigration) {
    promises.push(dbReferralMigration.destroy());
  }
  await Promise.all(promises);
  dbConsoleMigration = null;
  dbAmsMigration = null;
  dbStorageMigration = null;
  dbConfigMigration = null;
  dbAuthApiMigration = null;
  dbReferralMigration = null;
}

export async function destroyTestSeeds(): Promise<void> {
  const promises = [];
  if (dbConsoleSeed) {
    promises.push(dbConsoleSeed.destroy());
  }
  if (dbAmsSeed) {
    promises.push(dbAmsSeed.destroy());
  }
  // if (dbStorageSeed) {
  //   promises.push(dbStorageSeed.destroy());
  // }
  if (dbConfigSeed) {
    promises.push(dbConfigSeed.destroy());
  }
  await Promise.all(promises);
  dbConsoleSeed = null;
  dbAmsSeed = null;
  // dbStorageSeed = null;
  dbConfigSeed = null;
}

export async function rebuildTestDatabases(): Promise<void> {
  console.info('initMigrations start....');
  await initMigrations();
  console.info('initMigrations success');
  try {
    await Promise.all([
      dbAmsMigration.reset(),
      dbConsoleMigration.reset(),
      dbStorageMigration.reset(),
      dbConfigMigration.reset(),
      dbAuthApiMigration.reset(),
      dbReferralMigration.reset(),
    ]);
  } catch (err) {
    console.error('error at migrations.reset()', err);
    throw err;
  }
  await destroyTestMigrations();
  await initSeeds();
  try {
    await Promise.all([
      dbAmsSeed.reset(),
      dbConsoleSeed.reset(),
      // dbStorageSeed.reset(),
      dbConfigSeed.reset(),
    ]);
  } catch (err) {
    console.error('error at seed.reset()', err);
    throw err;
  }
  await destroyTestSeeds();
}

export async function dropTestDatabases(): Promise<void> {
  await unseedTestDatabases();
  await downgradeTestDatabases();
  await destroyTestMigrations();
  await destroyTestSeeds();
}

async function initDevConsoleTestMigrations() {
  try {
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
      throw new Error(`!!! ${poolConfig.database} NOT TEST DATABASE? !!!`);
    }

    const pool = createPool(poolConfig);

    dbConsoleMigration = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'migrations',
      dir: '../../modules/dev-console-api/src/migration-scripts/migrations',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbConsoleMigration.initialize();
  } catch (err) {
    console.error('Error at initDevConsoleTestMigrations', err);
    throw err;
  }
}

async function initAmsTestMigrations() {
  try {
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
      throw new Error(`!!! ${poolConfig.database} NOT TEST DATABASE? !!!`);
    }

    const pool = createPool(poolConfig);

    dbAmsMigration = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'migrations',
      dir: '../../services/access/src/migration-scripts/migrations',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbAmsMigration.initialize();
  } catch (err) {
    console.error('Error at initAmsTestMigrations', err);
    throw err;
  }
}

async function initDevConsoleTestSeed() {
  try {
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
      throw new Error(`!!! ${poolConfig.database} NOT TEST DATABASE? !!!`);
    }

    const pool = createPool(poolConfig);

    dbConsoleSeed = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'seeds',
      dir: '../../modules/dev-console-api/src/migration-scripts/seeds',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbConsoleSeed.initialize();
  } catch (err) {
    console.error('Error at initDevConsoleTestSeed', err);
    throw err;
  }
}

async function initStorageTestMigrations() {
  try {
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
      throw new Error(`!!! ${poolConfig.database} NOT TEST DATABASE? !!!`);
    }

    const pool = createPool(poolConfig);

    dbStorageMigration = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'migrations',
      dir: '../../services/storage/src/migration-scripts/migrations',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbStorageMigration.initialize();
  } catch (err) {
    console.error('Error at initStorageTestMigrations', err);
    throw err;
  }
}

// async function initStorageTestSeed() {
//   env.APP_ENV = AppEnvironment.TEST;

//   const poolConfig: ConnectionOptions = {
//     host: env.STORAGE_MYSQL_HOST_TEST,
//     database: env.STORAGE_MYSQL_DATABASE_TEST,
//     password: env.STORAGE_MYSQL_PASSWORD_TEST,
//     port: env.STORAGE_MYSQL_PORT_TEST,
//     user: env.STORAGE_MYSQL_USER_TEST,
//     // debug: true,
//     connectionLimit: 1,
//   };

//   if (!/(test|testing)/i.test(poolConfig.database)) {
//     throw new Error(`!!! ${poolConfig.database} NOT TEST DATABASE? !!!`);
//   }

//   const pool = createPool(poolConfig);

//   dbStorageMigration = new Migration({
//     conn: pool as unknown as MigrationConnection,
//     tableName: 'seeds',
//     dir: '../../services/storage/src/migration-scripts/seeds',
//     silent: env.APP_ENV === AppEnvironment.TEST,
//   });

//   await dbStorageSeed.initialize();
// }

async function initConfigTestMigrations() {
  try {
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
      throw new Error(`!!! ${poolConfig.database} NOT TEST DATABASE? !!!`);
    }

    const pool = createPool(poolConfig);

    dbConfigMigration = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'migrations',
      dir: '../../services/config/src/migration-scripts/migrations',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbConfigMigration.initialize();
  } catch (err) {
    console.error('Error at initConfigTestMigrations', err);
    throw err;
  }
}

async function initReferralTestMigrations() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolReferral: ConnectionOptions = {
    host: env.REFERRAL_MYSQL_HOST_TEST,
    database: env.REFERRAL_MYSQL_DATABASE_TEST,
    password: env.REFERRAL_MYSQL_PASSWORD_TEST,
    port: env.REFERRAL_MYSQL_PORT_TEST,
    user: env.REFERRAL_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolReferral.database)) {
    throw new Error('!!! NOT TEST DATABASE? !!!');
  }

  const pool = createPool(poolReferral);

  dbReferralMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'migrations',
    dir: '../../services/referral/src/migration-scripts/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbReferralMigration.initialize();
}

async function initAmsTestSeed() {
  try {
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
      throw new Error(`!!! ${poolConfig.database} NOT TEST DATABASE? !!!`);
    }

    const pool = createPool(poolConfig);

    dbAmsSeed = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'seeds',
      dir: '../../services/access/src/migration-scripts/seeds',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbAmsSeed.initialize();
  } catch (err) {
    console.error('Error at initConfigTestSeed', err);
    throw err;
  }
}

async function initConfigTestSeed() {
  try {
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
      throw new Error(`!!! ${poolConfig.database} NOT TEST DATABASE? !!!`);
    }

    const pool = createPool(poolConfig);

    dbConfigSeed = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'seeds',
      dir: '../../services/config/src/migration-scripts/seeds',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbConfigSeed.initialize();
  } catch (err) {
    console.error('Error at initConfigTestSeed', err);
    throw err;
  }
}

async function initAuthApiTestMigrations() {
  try {
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
      throw new Error('!!! NOT TEST DATABASE? !!!');
    }

    const pool = createPool(poolAuthApi);

    dbAuthApiMigration = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'migrations',
      dir: '../../modules/authentication-api/src/migration-scripts/migrations/',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbAuthApiMigration.initialize();
  } catch (err) {
    console.error('Error at initAuthApiTestMigrations', err);
    throw err;
  }
}

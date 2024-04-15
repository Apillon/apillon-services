import { Migration, MigrationConnection } from 'ts-mysql-migrate';
import { ConnectionOptions, createPool } from 'mysql2';
import { AppEnvironment, env } from '@apillon/lib';

let dbConsoleMigration: Migration = null;
let dbConsoleSeed: Migration = null;

let dbAmsMigration: Migration = null;
let dbAmsSeed: Migration = null;

let dbStorageMigration: Migration = null;
let dbStorageSeed: Migration = null;

let dbConfigMigration: Migration = null;
let dbConfigSeed: Migration = null;

let dbAuthApiMigration: Migration = null;
let dbAuthApiSeed: Migration = null;

let dbReferralMigration: Migration = null;
let dbReferralSeed: Migration = null;

let dbNftsMigration: Migration = null;
let dbNftsSeed: Migration = null;

let dbComputingMigration: Migration = null;
let dbComputingSeed: Migration = null;

let dbBcsMigration: Migration = null;
let dbBcsSeed: Migration = null;

let dbSocialMigration: Migration = null;

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

  if (!dbNftsMigration) {
    await initNftsTestMigrations();
  }

  if (!dbComputingMigration) {
    await initComputingTestMigrations();
  }

  if (!dbBcsMigration) {
    await initBcsTestMigrations();
  }

  if (!dbSocialMigration) {
    await initSocialTestMigrations();
  }
}

async function initSeeds() {
  if (!dbConsoleSeed) {
    await initDevConsoleTestSeed();
  }
  if (!dbAmsSeed) {
    await initAmsTestSeed();
  }
  if (!dbStorageSeed) {
    await initStorageTestSeed();
  }
  if (!dbConfigSeed) {
    await initConfigTestSeed();
  }

  if (!dbAuthApiSeed) {
    await initAuthApiTestSeed();
  }

  if (!dbReferralSeed) {
    await initReferralTestSeed();
  }
  if (!dbNftsSeed) {
    await initNftsTestSeed();
  }
  if (!dbComputingSeed) {
    await initComputingTestSeed();
  }
  if (!dbBcsSeed) {
    await initBcsTestSeed();
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
      dbNftsMigration.up(),
      dbComputingMigration.up(),
      dbBcsMigration.up(),
      dbSocialMigration.up(),
    ]);
  } catch (err) {
    console.error('error at migrations.up()', err);
    throw err;
  }

  await destroyTestMigrations();
}

export async function downgradeTestDatabases(): Promise<void> {
  await initMigrations();
  try {
    await dbReferralMigration.down(-1);

    await Promise.all([
      dbAmsMigration.down(-1),
      dbConfigMigration.down(-1),
      dbNftsMigration.down(-1),
      dbBcsMigration.down(-1),
      dbSocialMigration.down(-1),
    ]);

    await dbConsoleMigration.down(-1);
    await dbStorageMigration.down(-1);
    await dbAuthApiMigration.down(-1);
    await dbComputingMigration.down(-1);
  } catch (err) {
    console.error('error at migrations.down()', err);
    throw err;
  }

  await destroyTestMigrations();
}

export async function seedTestDatabases(): Promise<void> {
  await initSeeds();
  try {
    await Promise.all([
      dbAmsSeed.up(),
      dbConsoleSeed.up(),
      dbStorageSeed.up(),
      dbConfigSeed.up(),
      dbAuthApiSeed.up(),
      dbReferralSeed.up(),
      dbNftsSeed.up(),
      dbComputingSeed.up(),
      dbBcsSeed.up(),
    ]);
  } catch (err) {
    console.error('error at seeds.up()', err);
    throw err;
  }
  await destroyTestSeeds();
}

export async function unseedTestDatabases(): Promise<void> {
  await initSeeds();
  try {
    await Promise.all([
      dbAmsSeed.down(-1),
      dbConsoleSeed.down(-1),
      dbStorageSeed.down(-1),
      dbConfigSeed.down(-1),
      dbAuthApiSeed.down(-1),
      dbReferralSeed.down(-1),
      dbNftsSeed.down(-1),
      dbComputingSeed.down(-1),
      dbBcsSeed.down(-1),
    ]);
  } catch (err) {
    console.error('error at seeds.down()', err);
    throw err;
  }
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
  if (dbNftsMigration) {
    promises.push(dbNftsMigration.destroy());
  }
  if (dbComputingMigration) {
    promises.push(dbComputingMigration.destroy());
  }
  if (dbBcsMigration) {
    promises.push(dbBcsMigration.destroy());
  }
  if (dbSocialMigration) {
    promises.push(dbSocialMigration.destroy());
  }

  await Promise.all(promises);
  dbConsoleMigration = null;
  dbAmsMigration = null;
  dbStorageMigration = null;
  dbConfigMigration = null;
  dbAuthApiMigration = null;
  dbReferralMigration = null;
  dbNftsMigration = null;
  dbComputingMigration = null;
  dbBcsMigration = null;
  dbSocialMigration = null;
}

export async function destroyTestSeeds(): Promise<void> {
  const promises = [];
  if (dbConsoleSeed) {
    promises.push(dbConsoleSeed.destroy());
  }
  if (dbAmsSeed) {
    promises.push(dbAmsSeed.destroy());
  }
  if (dbStorageSeed) {
    promises.push(dbStorageSeed.destroy());
  }
  if (dbConfigSeed) {
    promises.push(dbConfigSeed.destroy());
  }

  if (dbAuthApiSeed) {
    promises.push(dbAuthApiSeed.destroy());
  }

  if (dbReferralSeed) {
    promises.push(dbReferralSeed.destroy());
  }

  if (dbNftsSeed) {
    promises.push(dbNftsSeed.destroy());
  }

  if (dbComputingSeed) {
    promises.push(dbComputingSeed.destroy());
  }

  if (dbBcsSeed) {
    promises.push(dbBcsSeed.destroy());
  }

  await Promise.all(promises);
  dbConsoleSeed = null;
  dbAmsSeed = null;
  dbStorageSeed = null;
  dbConfigSeed = null;
  dbAuthApiSeed = null;
  dbReferralSeed = null;
  dbNftsSeed = null;
  dbComputingSeed = null;
  dbBcsSeed = null;
}

export async function rebuildTestDatabases(): Promise<void> {
  console.info('initMigrations start....');
  await initMigrations();
  console.info('initMigrations success');
  try {
    const migrationResults = await Promise.allSettled([
      dbAmsMigration.reset(),
      dbConsoleMigration.reset(),
      dbStorageMigration.reset(),
      dbConfigMigration.reset(),
      dbAuthApiMigration.reset(),
      dbNftsMigration.reset(),
      dbComputingMigration.reset(),
      dbBcsMigration.reset(),
      dbSocialMigration.reset(),
    ]);

    // referral depends on other db!
    await dbReferralMigration.reset();

    for (const res of migrationResults) {
      if (res.status === 'rejected') {
        throw new Error(`Migration reset rejected with: ${res.reason}`);
      }
    }
  } catch (err) {
    console.error('error at migrations.reset()', err);
    throw err;
  }
  await destroyTestMigrations();
  await initSeeds();
  try {
    const migrationResults = await Promise.allSettled([
      dbAmsSeed.reset(),
      dbConsoleSeed.reset(),
      dbStorageSeed.reset(),
      dbConfigSeed.reset(),
      dbAuthApiSeed.reset(),
      dbReferralSeed.reset(),
      dbNftsSeed.reset(),
      dbComputingSeed.reset(),
      dbBcsSeed.reset(),
    ]);
    for (const res of migrationResults) {
      if (res.status === 'rejected') {
        throw new Error(`Migration reset rejected with: ${res.reason}`);
      }
    }
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

    const devConsoleConfig: ConnectionOptions = {
      host: env.DEV_CONSOLE_API_MYSQL_HOST_TEST,
      database: env.DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
      password: env.DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
      port: env.DEV_CONSOLE_API_MYSQL_PORT_TEST,
      user: env.DEV_CONSOLE_API_MYSQL_USER_TEST,
      // debug: true,
      connectionLimit: 1,
    };

    if (!/(test|testing)/i.test(devConsoleConfig.database)) {
      throw new Error(`DEV-CONSOLE: NO TEST DATABASE!`);
    }

    const pool = createPool(devConsoleConfig);

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

    const storageConfig: ConnectionOptions = {
      host: env.STORAGE_MYSQL_HOST_TEST,
      database: env.STORAGE_MYSQL_DATABASE_TEST,
      password: env.STORAGE_MYSQL_PASSWORD_TEST,
      port: env.STORAGE_MYSQL_PORT_TEST,
      user: env.STORAGE_MYSQL_USER_TEST,
      // debug: true,
      connectionLimit: 1,
    };

    if (!/(test|testing)/i.test(storageConfig.database)) {
      throw new Error(`STORAGE: NO TEST DATABASE!`);
    }

    const pool = createPool(storageConfig);

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

async function initStorageTestSeed() {
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

  dbStorageSeed = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'seeds',
    dir: '../../services/storage/src/migration-scripts/seeds',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbStorageSeed.initialize();
}

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
      throw new Error(`CONFIG: NO TEST DATABASE!`);
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
    throw new Error(`REFERRAL: NO TEST DATABASE!`);
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

async function initReferralTestSeed() {
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
    throw new Error(`REFERRAL: NO TEST DATABASE!`);
  }

  const pool = createPool(poolReferral);

  dbReferralSeed = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'seeds',
    dir: '../../services/referral/src/migration-scripts/seeds',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbReferralSeed.initialize();
}

async function initNftsTestMigrations() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolNfts: ConnectionOptions = {
    host: env.NFTS_MYSQL_HOST_TEST,
    database: env.NFTS_MYSQL_DATABASE_TEST,
    password: env.NFTS_MYSQL_PASSWORD_TEST,
    port: env.NFTS_MYSQL_PORT_TEST,
    user: env.NFTS_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolNfts.database)) {
    throw new Error(`NFTS: NO TEST DATABASE!`);
  }

  const pool = createPool(poolNfts);

  dbNftsMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'migrations',
    dir: '../../services/nfts/src/migration-scripts/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbNftsMigration.initialize();
}

async function initNftsTestSeed() {
  try {
    env.APP_ENV = AppEnvironment.TEST;

    const poolNfts: ConnectionOptions = {
      host: env.NFTS_MYSQL_HOST_TEST,
      database: env.NFTS_MYSQL_DATABASE_TEST,
      password: env.NFTS_MYSQL_PASSWORD_TEST,
      port: env.NFTS_MYSQL_PORT_TEST,
      user: env.NFTS_MYSQL_USER_TEST,
      // debug: true,
      connectionLimit: 1,
    };

    if (!/(test|testing)/i.test(poolNfts.database)) {
      throw new Error(`NFTS: NO TEST DATABASE!`);
    }

    const pool = createPool(poolNfts);

    dbNftsSeed = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'seeds',
      dir: '../../services/nfts/src/migration-scripts/seeds',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbNftsSeed.initialize();
  } catch (err) {
    console.error('Error at initConfigTestSeed', err);
    throw err;
  }
}

async function initComputingTestMigrations() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolNfts: ConnectionOptions = {
    host: env.COMPUTING_MYSQL_HOST_TEST,
    database: env.COMPUTING_MYSQL_DATABASE_TEST,
    password: env.COMPUTING_MYSQL_PASSWORD_TEST,
    port: env.COMPUTING_MYSQL_PORT_TEST,
    user: env.COMPUTING_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolNfts.database)) {
    throw new Error(`COMPUTING: NO TEST DATABASE!`);
  }

  const pool = createPool(poolNfts);

  dbComputingMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'migrations',
    dir: '../../services/computing/src/migration-scripts/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbComputingMigration.initialize();
}

async function initComputingTestSeed() {
  try {
    env.APP_ENV = AppEnvironment.TEST;

    const poolOptions: ConnectionOptions = {
      host: env.COMPUTING_MYSQL_HOST_TEST,
      database: env.COMPUTING_MYSQL_DATABASE_TEST,
      password: env.COMPUTING_MYSQL_PASSWORD_TEST,
      port: env.COMPUTING_MYSQL_PORT_TEST,
      user: env.COMPUTING_MYSQL_USER_TEST,
      // debug: true,
      connectionLimit: 1,
    };

    if (!/(test|testing)/i.test(poolOptions.database)) {
      throw new Error(`COMPUTING: NO TEST DATABASE!`);
    }

    const pool = createPool(poolOptions);

    dbComputingSeed = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'seeds',
      dir: '../../services/computing/src/migration-scripts/seeds',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbComputingSeed.initialize();
  } catch (err) {
    console.error('Error at initConfigTestSeed', err);
    throw err;
  }
}

async function initAmsTestSeed() {
  try {
    env.APP_ENV = AppEnvironment.TEST;

    const poolAccess: ConnectionOptions = {
      host: env.ACCESS_MYSQL_HOST_TEST,
      database: env.ACCESS_MYSQL_DATABASE_TEST,
      password: env.ACCESS_MYSQL_PASSWORD_TEST,
      port: env.ACCESS_MYSQL_PORT_TEST,
      user: env.ACCESS_MYSQL_USER_TEST,
      // debug: true,
      connectionLimit: 1,
    };

    if (!/(test|testing)/i.test(poolAccess.database)) {
      throw new Error(`AMS: NO TEST DATABASE!`);
    }

    const pool = createPool(poolAccess);

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
      throw new Error(`CONFIG: NO TEST DATABASE!`);
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
      throw new Error(`AUTH-API: NO TEST DATABASE!`);
    }

    const pool = createPool(poolAuthApi);

    dbAuthApiMigration = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'migrations',
      dir: '../../services/authentication/src/migration-scripts/migrations/',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbAuthApiMigration.initialize();
  } catch (err) {
    console.error('Error at initAuthApiTestMigrations', err);
    throw err;
  }
}

async function initAuthApiTestSeed() {
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
      throw new Error(`AUTH-API: NO TEST DATABASE!`);
    }

    const pool = createPool(poolAuthApi);

    dbAuthApiSeed = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'seeds',
      dir: '../../services/authentication/src/migration-scripts/seeds',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbAuthApiSeed.initialize();
  } catch (err) {
    console.error('Error at initAuthApiTestSeed', err);
    throw err;
  }
}

async function initBcsTestMigrations() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolBcs: ConnectionOptions = {
    host: env.BLOCKCHAIN_MYSQL_HOST_TEST,
    database: env.BLOCKCHAIN_MYSQL_DATABASE_TEST,
    password: env.BLOCKCHAIN_MYSQL_PASSWORD_TEST,
    port: env.BLOCKCHAIN_MYSQL_PORT_TEST,
    user: env.BLOCKCHAIN_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolBcs.database)) {
    throw new Error(`Blockchain: NO TEST DATABASE!`);
  }

  const pool = createPool(poolBcs);

  dbBcsMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'migrations',
    dir: '../../services/blockchain/src/migration-scripts/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbBcsMigration.initialize();
}

async function initBcsTestSeed() {
  try {
    env.APP_ENV = AppEnvironment.TEST;

    const poolBcs: ConnectionOptions = {
      host: env.BLOCKCHAIN_MYSQL_HOST_TEST,
      database: env.BLOCKCHAIN_MYSQL_DATABASE_TEST,
      password: env.BLOCKCHAIN_MYSQL_PASSWORD_TEST,
      port: env.BLOCKCHAIN_MYSQL_PORT_TEST,
      user: env.BLOCKCHAIN_MYSQL_USER_TEST,
      // debug: true,
      connectionLimit: 1,
    };

    if (!/(test|testing)/i.test(poolBcs.database)) {
      throw new Error(`Blockchain: NO TEST DATABASE!`);
    }

    const pool = createPool(poolBcs);

    dbBcsSeed = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName: 'seeds',
      dir: '../../services/blockchain/src/migration-scripts/seeds',
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await dbBcsSeed.initialize();
  } catch (err) {
    console.error('Error at initBcsTestSeed', err);
    throw err;
  }
}

async function initSocialTestMigrations() {
  env.APP_ENV = AppEnvironment.TEST;

  const poolSocial: ConnectionOptions = {
    host: env.SOCIAL_MYSQL_HOST_TEST,
    database: env.SOCIAL_MYSQL_DATABASE_TEST,
    password: env.SOCIAL_MYSQL_PASSWORD_TEST,
    port: env.SOCIAL_MYSQL_PORT_TEST,
    user: env.SOCIAL_MYSQL_USER_TEST,
    // debug: true,
    connectionLimit: 1,
  };

  if (!/(test|testing)/i.test(poolSocial.database)) {
    throw new Error(`Social: NO TEST DATABASE!`);
  }

  const pool = createPool(poolSocial);

  dbSocialMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'migrations',
    dir: '../../services/social/src/migration-scripts/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbSocialMigration.initialize();
}

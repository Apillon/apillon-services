import { Migration, MigrationConnection } from 'ts-mysql-migrate';
import { ConnectionOptions, createPool } from 'mysql2';
import { AppEnvironment, env } from '@apillon/lib';
import { StageObject, StageName } from '../interfaces/stage.interface';
import * as fs from 'node:fs';

export const SQL_CONFIGS: StageObject<ConnectionOptions> = {
  [StageName.DEV_CONSOLE]: {
    host: env.DEV_CONSOLE_API_MYSQL_HOST_TEST,
    database: env.DEV_CONSOLE_API_MYSQL_DATABASE_TEST,
    password: env.DEV_CONSOLE_API_MYSQL_PASSWORD_TEST,
    port: env.DEV_CONSOLE_API_MYSQL_PORT_TEST,
    user: env.DEV_CONSOLE_API_MYSQL_USER_TEST,
  },
  [StageName.ACCESS]: {
    host: env.ACCESS_MYSQL_HOST_TEST,
    database: env.ACCESS_MYSQL_DATABASE_TEST,
    password: env.ACCESS_MYSQL_PASSWORD_TEST,
    port: env.ACCESS_MYSQL_PORT_TEST,
    user: env.ACCESS_MYSQL_USER_TEST,
  },
  [StageName.STORAGE]: {
    host: env.STORAGE_MYSQL_HOST_TEST,
    database: env.STORAGE_MYSQL_DATABASE_TEST,
    password: env.STORAGE_MYSQL_PASSWORD_TEST,
    port: env.STORAGE_MYSQL_PORT_TEST,
    user: env.STORAGE_MYSQL_USER_TEST,
  },
  [StageName.CONFIG]: {
    host: env.CONFIG_MYSQL_HOST_TEST,
    database: env.CONFIG_MYSQL_DATABASE_TEST,
    password: env.CONFIG_MYSQL_PASSWORD_TEST,
    port: env.CONFIG_MYSQL_PORT_TEST,
    user: env.CONFIG_MYSQL_USER_TEST,
  },
  [StageName.AUTH_API]: {
    host: env.AUTH_API_MYSQL_HOST_TEST,
    database: env.AUTH_API_MYSQL_DATABASE_TEST,
    password: env.AUTH_API_MYSQL_PASSWORD_TEST,
    port: env.AUTH_API_MYSQL_PORT_TEST,
    user: env.AUTH_API_MYSQL_USER_TEST,
  },
  [StageName.REFERRAL]: {
    host: env.REFERRAL_MYSQL_HOST_TEST,
    database: env.REFERRAL_MYSQL_DATABASE_TEST,
    password: env.REFERRAL_MYSQL_PASSWORD_TEST,
    port: env.REFERRAL_MYSQL_PORT_TEST,
    user: env.REFERRAL_MYSQL_USER_TEST,
  },
  [StageName.NFTS]: {
    host: env.NFTS_MYSQL_HOST_TEST,
    database: env.NFTS_MYSQL_DATABASE_TEST,
    password: env.NFTS_MYSQL_PASSWORD_TEST,
    port: env.NFTS_MYSQL_PORT_TEST,
    user: env.NFTS_MYSQL_USER_TEST,
  },
  [StageName.BLOCKCHAIN]: {
    host: env.BLOCKCHAIN_MYSQL_HOST_TEST,
    database: env.BLOCKCHAIN_MYSQL_DATABASE_TEST,
    password: env.BLOCKCHAIN_MYSQL_PASSWORD_TEST,
    port: env.BLOCKCHAIN_MYSQL_PORT_TEST,
    user: env.BLOCKCHAIN_MYSQL_USER_TEST,
  },
  [StageName.COMPUTING]: {
    host: env.COMPUTING_MYSQL_HOST_TEST,
    database: env.COMPUTING_MYSQL_DATABASE_TEST,
    password: env.COMPUTING_MYSQL_PASSWORD_TEST,
    port: env.COMPUTING_MYSQL_PORT_TEST,
    user: env.COMPUTING_MYSQL_USER_TEST,
  },
  [StageName.SOCIAL]: {
    host: env.SOCIAL_MYSQL_HOST_TEST,
    database: env.SOCIAL_MYSQL_DATABASE_TEST,
    password: env.SOCIAL_MYSQL_PASSWORD_TEST,
    port: env.SOCIAL_MYSQL_PORT_TEST,
    user: env.SOCIAL_MYSQL_USER_TEST,
  },
  [StageName.INFRASTRUCTURE]: {
    host: env.INFRASTRUCTURE_MYSQL_HOST_TEST,
    database: env.INFRASTRUCTURE_MYSQL_DATABASE_TEST,
    password: env.INFRASTRUCTURE_MYSQL_PASSWORD_TEST,
    port: env.INFRASTRUCTURE_MYSQL_PORT_TEST,
    user: env.INFRASTRUCTURE_MYSQL_USER_TEST,
  },
  [StageName.CONTRACTS]: {
    host: env.CONTRACTS_MYSQL_HOST_TEST,
    database: env.CONTRACTS_MYSQL_DATABASE_TEST,
    password: env.CONTRACTS_MYSQL_PASSWORD_TEST,
    port: env.CONTRACTS_MYSQL_PORT_TEST,
    user: env.CONTRACTS_MYSQL_USER_TEST,
  },
  [StageName.MAILING]: {
    host: env.MAILING_MYSQL_HOST_TEST,
    database: env.MAILING_MYSQL_DATABASE_TEST,
    password: env.MAILING_MYSQL_PASSWORD_TEST,
    port: env.MAILING_MYSQL_PORT_TEST,
    user: env.MAILING_MYSQL_USER_TEST,
  },
  [StageName.DEPLOY]: {
    host: env.DEPLOY_MYSQL_HOST_TEST,
    database: env.DEPLOY_MYSQL_DATABASE_TEST,
    password: env.DEPLOY_MYSQL_PASSWORD_TEST,
    port: env.DEPLOY_MYSQL_PORT_TEST,
    user: env.DEPLOY_MYSQL_USER_TEST,
  },
};

let migrations: Partial<StageObject<Migration>> = {};
let seeds: Partial<StageObject<Migration>> = {};

function getServiceMigrationFolder(stageName: string) {
  return stageName === StageName.DEV_CONSOLE
    ? '../../modules/dev-console-api/src/migration-scripts'
    : `../../services/${stageName}/src/migration-scripts`;
}

async function initMigrations() {
  for (const [stageName, config] of Object.entries(SQL_CONFIGS)) {
    // skip if already initialized
    if (migrations[stageName]) {
      continue;
    }
    const folder = `${getServiceMigrationFolder(stageName)}/migrations`;
    migrations[stageName] = await initDbTable('migrations', folder, config);
  }
}

async function initSeeds() {
  for (const [stageName, config] of Object.entries(SQL_CONFIGS)) {
    // skip if already initialized
    if (seeds[stageName]) {
      continue;
    }
    const folder = `${getServiceMigrationFolder(stageName)}/seeds`;
    // seeds are optional so we skip them if not found
    if (!fs.existsSync(folder)) {
      console.warn(`Seed folder does not exist for ${stageName}.`);
      continue;
    }
    seeds[stageName] = await initDbTable('seeds', folder, config);
  }
}

export async function downgradeTestDatabases(): Promise<void> {
  await initMigrations();

  try {
    await migrations[StageName.REFERRAL].down(-1);
    await migrations[StageName.DEV_CONSOLE].down(-1);

    await Promise.all(
      Object.values(StageName)
        .filter(
          (stageName) =>
            ![StageName.REFERRAL, StageName.DEV_CONSOLE].includes(stageName),
        )
        .map((stageName) => migrations[stageName].down(-1)),
    );
  } catch (err) {
    console.error('error at migrations.down()', err);
    throw err;
  }

  await destroyTestMigrations();
}

export async function unseedTestDatabases(): Promise<void> {
  await initSeeds();
  try {
    await Promise.all(
      Object.values(StageName).map((stageName) => seeds[stageName]?.down(-1)),
    );
  } catch (err) {
    console.error('error at seeds.down()', err);
    throw err;
  }
  await destroyTestSeeds();
}

export async function destroyTestMigrations(): Promise<void> {
  await Promise.all(
    Object.values(StageName).map((stageName) =>
      migrations[stageName]?.destroy(),
    ),
  );
  migrations = {};
}

export async function destroyTestSeeds(): Promise<void> {
  await Promise.all(
    Object.values(StageName).map((stageName) => seeds[stageName]?.destroy()),
  );
  seeds = {};
}

export async function rebuildTestDatabases(): Promise<void> {
  console.info('initMigrations start....');
  await initMigrations();
  console.info('initMigrations success');

  const stageNames = Object.values(StageName).filter(
    (stageName) =>
      ![StageName.REFERRAL, StageName.DEV_CONSOLE].includes(stageName),
  );

  for (const stageName of stageNames) {
    try {
      await migrations[stageName].reset();
      console.log(`Migration ${stageName} reset successfully.`);
    } catch (error) {
      console.error(`Failed to reset migration ${stageName}:`, error);
      throw error;
    }
  }

  // migrations using DB tables that depend on migrations above
  try {
    await migrations[StageName.DEV_CONSOLE].reset();
    console.log(`Migration ${StageName.DEV_CONSOLE} reset successfully.`);
  } catch (error) {
    console.error(`Failed to reset migration ${StageName.DEV_CONSOLE}:`, error);
    throw error;
  }

  try {
    await migrations[StageName.REFERRAL].reset();
    console.log(`Migration ${StageName.REFERRAL} reset successfully.`);
  } catch (error) {
    console.error(`Failed to reset migration ${StageName.REFERRAL}:`, error);
    throw error;
  }

  await destroyTestMigrations();
  await initSeeds();
  for (const stageName of Object.values(StageName)) {
    if (seeds[stageName]?.reset) {
      try {
        await seeds[stageName].reset();
        console.log(`Seed ${stageName} reset successfully.`);
      } catch (error) {
        console.error(`Failed to reset seed ${stageName}:`, error);
        throw error;
      }
    }
  }

  await destroyTestSeeds();
}

export async function dropTestDatabases(): Promise<void> {
  await unseedTestDatabases();
  await downgradeTestDatabases();
  await destroyTestMigrations();
  await destroyTestSeeds();
}

async function initDbTable(
  tableName: 'migrations' | 'seeds',
  dir: string,
  poolConfig: ConnectionOptions,
) {
  try {
    env.APP_ENV = AppEnvironment.TEST;

    if (!/(test|testing)/i.test(poolConfig.database)) {
      throw new Error(`!!! ${poolConfig.database} NOT TEST DATABASE? !!!`);
    }

    const pool = createPool({
      ...poolConfig,
      // debug: true,
      connectionLimit: 1,
    });

    const migration = new Migration({
      conn: pool as unknown as MigrationConnection,
      tableName,
      dir,
      silent: env.APP_ENV === AppEnvironment.TEST,
    });

    await migration.initialize();
    return migration;
  } catch (err) {
    console.error(
      `Error at initDbTable for table ${tableName} on ${poolConfig.host}:`,
      err,
    );
    throw err;
  }
}

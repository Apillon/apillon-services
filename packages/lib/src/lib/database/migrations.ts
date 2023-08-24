import { Migration, MigrationConnection } from 'ts-mysql-migrate';
import { ConnectionOptions, createPool } from 'mysql2';
import { AppEnvironment } from '../../config/types';
import { env } from '../../config/env';

let dbMigration: Migration = null;
let seedMigration: Migration = null;

//#region DB-migration functions
export async function setupDatabase(
  database: string,
  host: string,
  port: number,
  user: string,
  password: string,
): Promise<void> {
  if (!dbMigration) {
    await initMigrations(database, host, port, user, password);
  }
  await dbMigration.up();
}

export async function upgradeDatabase(
  database: string,
  host: string,
  port: number,
  user: string,
  password: string,
  steps?: number,
): Promise<void> {
  if (!dbMigration) {
    await initMigrations(database, host, port, user, password);
  }
  await dbMigration.up(steps);
}

export async function downgradeDatabase(
  database: string,
  host: string,
  port: number,
  user: string,
  password: string,
  steps?: number,
): Promise<void> {
  if (!dbMigration) {
    await initMigrations(database, host, port, user, password);
  }
  await dbMigration.down(steps);
}

export async function clearDatabase(
  database: string,
  host: string,
  port: number,
  user: string,
  password: string,
): Promise<void> {
  await rebuildDatabase(database, host, port, user, password);
}

export async function destroyMigrations(): Promise<void> {
  await dbMigration.destroy();
}

export async function rebuildDatabase(
  database: string,
  host: string,
  port: number,
  user: string,
  password: string,
): Promise<void> {
  if (!dbMigration) {
    await initMigrations(database, host, port, user, password);
  }

  await dbMigration.reset();
}

export async function dropDatabase(
  database: string,
  host: string,
  port: number,
  user: string,
  password: string,
): Promise<void> {
  if (!dbMigration || !seedMigration) {
    await initMigrations(database, host, port, user, password);
  }
  await seedMigration.down(-1);
  await dbMigration.down(-1);
  await dbMigration.destroy();
  // await seedMigration.destroy();
}
//# endregion

//#region DB-seeds functions

export async function seedDatabase(
  database: string,
  host: string,
  port: number,
  user: string,
  password: string,
  steps?: number,
): Promise<void> {
  if (!seedMigration) {
    await initMigrations(database, host, port, user, password);
  }
  await seedMigration.up(steps);
}

export async function unseedDatabase(
  database: string,
  host: string,
  port: number,
  user: string,
  password: string,
  steps?: number,
): Promise<void> {
  if (!seedMigration) {
    await initMigrations(database, host, port, user, password);
  }
  await seedMigration.down(steps);
}

//#endregion

/**
 * Initialize Migration object
 * @param database
 * @param host
 * @param port
 * @param user
 * @param password
 * @param tableName defaults to "migrations". Can be anything
 * @param migrationDirectory migration-scripts directory
 */
async function initMigrations(
  database: string,
  host: string,
  port: number,
  user: string,
  password: string,
  tableName?: string,
  migrationDirectory?: string,
) {
  const poolConfig: ConnectionOptions = {
    host: host,
    port: port,
    user: user,
    password: password,
    database: database,
    // debug: true,
    connectionLimit: 1,
  };

  console.log(`Initializing migrations for ${env.APP_ENV} environment!`);

  if (
    env.APP_ENV === AppEnvironment.TEST &&
    !/(test|testing)/i.test(poolConfig.database)
  ) {
    throw new Error(`!!! ${poolConfig.database} NOT TEST DATABASE? !!!`);
  }

  const pool = createPool(poolConfig);

  dbMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: tableName ? tableName : 'migrations',
    dir: migrationDirectory
      ? migrationDirectory
      : './src/migration-scripts/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
    // silent: false,
  });

  seedMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: tableName ? tableName : 'seeds',
    dir: './src/migration-scripts/seeds',
    silent: env.APP_ENV === AppEnvironment.TEST,
    // silent: false,
  });

  await dbMigration.initialize();
  await seedMigration.initialize();
}

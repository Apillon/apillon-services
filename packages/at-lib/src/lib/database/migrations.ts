import { Migration, MigrationConnection } from 'ts-mysql-migrate';
import { ConnectionOptions, createPool } from 'mysql2';
import { AppEnvironment } from '../../config/types';
import { env } from '../../config/env';

let dbMigration: Migration = null;

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
  if (!dbMigration) {
    await initMigrations(database, host, port, user, password);
  }
  await dbMigration.down(-1);
  await dbMigration.destroy();
}

async function initMigrations(
  database: string,
  host: string,
  port: number,
  user: string,
  password: string,
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

  if (
    env.APP_ENV === AppEnvironment.TEST &&
    !/(test|testing)/i.test(poolConfig.database)
  ) {
    throw new Error('!!! NOT TEST DATABASE? !!!');
  }

  const pool = createPool(poolConfig);

  dbMigration = new Migration({
    conn: pool as unknown as MigrationConnection,
    tableName: 'migrations',
    dir: './src/migration-scripts/migrations',
    silent: env.APP_ENV === AppEnvironment.TEST,
  });

  await dbMigration.initialize();
}

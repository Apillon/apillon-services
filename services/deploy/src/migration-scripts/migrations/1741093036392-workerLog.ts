import { DbTables } from '@apillon/workers-lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.WORKER_LOG}\`
    (
      \`id\`
      INT
      NOT
      NULL
      AUTO_INCREMENT,
      \`ts\`
      DATETIME
      DEFAULT
      CURRENT_TIMESTAMP,
      \`status\`
      INT
      NULL,
      \`worker\`
      VARCHAR
     (
      100
     ) NULL,
      \`type\` VARCHAR
     (
       100
     ) NULL,
      \`message\` TEXT NULL,
      \`data\` JSON NULL,
      \`uuid\` VARCHAR
     (
       45
     ) NULL,
      PRIMARY KEY
     (
       \`id\`
     )
      );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.WORKER_LOG}\`;
  `);
}

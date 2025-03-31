import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.BACKEND}\`
    (
      \`id\`
      INT
      NOT
      NULL
      AUTO_INCREMENT,
      \`status\`
      INT
      NULL,
      \`project_uuid\`
      VARCHAR
     (
      36
     ) NOT NULL,

      \`backend_uuid\` VARCHAR
     (
       36
     ) NOT NULL,
      \`name\` VARCHAR
     (
       255
     ) NOT NULL,
      \`description\` VARCHAR
     (
       1000
     ) NULL,
      \`instanceId\` VARCHAR
     (
       255
     ) NOT NULL,
      \`url\` VARCHAR
     (
       255
     ) NOT NULL,
      \`data\` JSON NULL,

      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY
     (
       \`id\`
     ),
      CONSTRAINT unique_backend_uuid UNIQUE
     (
       backend_uuid
     )
      );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.BACKEND}\`;
  `);
}

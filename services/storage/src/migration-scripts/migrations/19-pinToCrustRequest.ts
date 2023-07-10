import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.PIN_TO_CRUST_REQUEST}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`bucket_uuid\` VARCHAR(36) NOT NULL,
  \`cid\` VARCHAR(255) NULL,
  \`size\` BIGINT NOT NULL,
  \`isDirectory\` BOOLEAN NOT NULL DEFAULT 0,
  \`refId\` VARCHAR(36) NULL,
  \`refTable\` VARCHAR(255) NULL,
  \`pinningStatus\` INT NOT NULL DEFAULT 0,
  \`numOfExecutions\` INT NOT NULL DEFAULT 0,
  \`message\` TEXT NULL,
  \`status\` INT NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`)
  )`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.PIN_TO_CRUST_REQUEST}\`;
  `);
}

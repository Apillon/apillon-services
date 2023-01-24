import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.WEB_PAGE}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`project_uuid\` VARCHAR(36) NOT NULL,
  \`bucket_id\` INT NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`description\` VARCHAR(1000) NULL,
  \`domain\` VARCHAR(1000) NULL,
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
    DROP TABLE IF EXISTS \`${DbTables.WEB_PAGE}\`;
  `);
}

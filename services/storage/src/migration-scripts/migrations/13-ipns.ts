import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.IPNS}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`project_uuid\` VARCHAR(36) NOT NULL,
  \`bucket_id\` INT NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`description\` VARCHAR(1000) NULL,
  \`ipnsName\` VARCHAR(255) NOT NULL,
  \`ipnsValue\` VARCHAR(255) NOT NULL,
  \`cid\` VARCHAR(255) NOT NULL,
  \`status\` INT NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`ipns_unique_key\` (\`project_uuid\`,\`name\`)
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.IPNS}\`;
  `);
}

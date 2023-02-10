import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.DEPLOYMENT}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`webPage_id\` INT NOT NULL,
  \`bucket_id\` INT NOT NULL,
  \`environment\` INT NOT NULL,
  \`deploymentStatus\` INT NOT NULL,
  \`cid\` VARCHAR(255) NULL,
  \`size\` BIGINT NULL,
  \`number\` BIGINT NULL,
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
    DROP TABLE IF EXISTS \`${DbTables.DEPLOYMENT}\`;
  `);
}

import { SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.PRODUCT}\` (
      \`id\` INT NOT NULL,
      \`status\` INT NULL DEFAULT ${SqlModelStatus.ACTIVE},
      \`name\` VARCHAR(255) NOT NULL,
      \`description\` VARCHAR(1000) NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` VARCHAR(36) NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` VARCHAR(36) NULL,
      PRIMARY KEY (\`id\`));
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
      DROP TABLE IF EXISTS \`${DbTables.PRODUCT}\`;
    `);
}

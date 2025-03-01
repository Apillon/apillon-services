import { SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.INDEXER}\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`indexer_uuid\` VARCHAR(36) NOT NULL,
      \`project_uuid\` VARCHAR(36) NOT NULL,
      \`status\` INT NOT NULL DEFAULT ${SqlModelStatus.DRAFT},
      \`name\` VARCHAR(255) NOT NULL,
      \`description\` VARCHAR(1000),
      \`squidId\` INT NULL,
      \`squidReference\` VARCHAR(255) NULL,
      \`lastDeploymentId\` INT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL
      )
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`DROP TABLE IF EXISTS \`${DbTables.INDEXER}\``);
}

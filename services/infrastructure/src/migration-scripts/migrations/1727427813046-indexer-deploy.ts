import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.INDEXER_DEPLOY}\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`status\` INT NULL,
      \`indexer_id\` INT NOT NULL,
      \`deployment_uuid\` VARCHAR(36) NOT NULL,
      \`s3Key\` VARCHAR(255) NOT NULL,
      \`s3Url\` VARCHAR(1000),
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
  await queryFn(`DROP TABLE IF EXISTS \`${DbTables.INDEXER_DEPLOY}\``);
}

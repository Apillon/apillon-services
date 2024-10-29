import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.INDEXER_BILLING}\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`indexer_id\` INT NOT NULL,
      \`year\` INT NOT NULL,
      \`month\` INT NOT NULL,
      \`billedAmount\` DECIMAL(12,2) NOT NULL DEFAULT 0,
      \`status\` INT NULL,
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
  await queryFn(`DROP TABLE IF EXISTS \`${DbTables.INDEXER_BILLING}\``);
}

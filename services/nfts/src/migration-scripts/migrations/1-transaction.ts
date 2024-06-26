import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  // TODO: Add execution Wallet and chain id
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.TRANSACTION}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`chainId\` INT NOT NULL,
  \`transactionType\` INT NOT NULL,
  \`refTable\` VARCHAR(100) NULL,
  \`refId\` INT NULL,
  \`transactionStatus\` INT NULL,
  \`transactionHash\` VARCHAR(255) NULL,
  \`errorMessage\` TEXT NULL,
  \`status\` INT NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`)
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.TRANSACTION}\`;
  `);
}

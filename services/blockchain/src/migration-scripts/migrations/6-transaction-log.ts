import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.TRANSACTION_LOG}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`ts\` DATETIME NULL,
      \`blockId\` INT NOT NULL,
      \`status\` INT NOT NULL,
      \`direction\` INT NOT NULL,
      \`action\` VARCHAR(20) NOT NULL,
      \`chain\` INT NOT NULL,
      \`chainType\` INT NOT NULL,
      \`wallet\` VARCHAR(50) NOT NULL,
      \`addressFrom\` VARCHAR(50) NULL,
      \`addressTo\` VARCHAR(50) NULL,
      \`hash\` VARCHAR(500) NOT NULL,
      \`transactionQueue_id\` INT NULL,
      \`token\` VARCHAR(10) NOT NULL,
      \`amount\` DECIMAL(40,0) NOT NULL,
      \`fee\` DECIMAL(40,0) NOT NULL,
      \`totalPrice\` DECIMAL(40,0) NOT NULL,
      \`value\` DECIMAL(12,2) NULL,
      \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`));
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.TRANSACTION_LOG}\`;
  `);
}

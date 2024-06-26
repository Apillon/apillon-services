import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.CLUSTER_TRANSACTION_LOG}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`ts\` DATETIME NULL,
      \`blockId\` INT NOT NULL,
      \`status\` INT NOT NULL,
      \`project_uuid\` VARCHAR(36) NULL,
      \`direction\` INT NOT NULL,
      \`action\` VARCHAR(20) NOT NULL,
      \`chain\` INT NOT NULL,
      \`chainType\` INT NOT NULL,
      \`wallet\` VARCHAR(50) NULL,
      \`clusterId\` VARCHAR(66) NULL,
      \`addressFrom\` VARCHAR(50) NULL,
      \`addressTo\` VARCHAR(50) NULL,
      \`hash\` VARCHAR(500) NOT NULL,
      \`transaction_id\` INT NULL,
      \`token\` VARCHAR(10) NOT NULL,
      \`amount\` DECIMAL(40,0) NULL,
      \`fee\` DECIMAL(40,0) NULL,
      \`totalPrice\` DECIMAL(40,0) NULL,
      \`value\` DECIMAL(12,2) NULL,

      \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`));
  `);
  await queryFn(`
    ALTER TABLE  \`${DbTables.CLUSTER_TRANSACTION_LOG}\`
    ADD UNIQUE INDEX \`idx_log_hash\` (\`hash\` ASC, \`chain\` ASC, \`chainType\` ASC);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.CLUSTER_TRANSACTION_LOG}\`;
  `);
}

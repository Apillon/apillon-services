import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.CLUSTER_WALLET}\`
    (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`status\` INT NULL,
      \`clusterId\` CHAR (66),
      \`walletAddress\` CHAR (66),
      \`minBalance\` DECIMAL(40,0) NULL,
      \`currentBalance\` DECIMAL(40,0) NULL,
      \`totalBalance\` DECIMAL(40,0) NULL,
      \`decimals\` INT(3) NULL,
      \`token\` VARCHAR(10) NULL,

      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY ( \`id\`)
      );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.CLUSTER_WALLET}\`;
  `);
}

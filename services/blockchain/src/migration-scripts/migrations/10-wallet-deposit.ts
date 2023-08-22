import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.WALLET_DEPOSIT}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`status\` INT NULL,
    \`wallet_id\` INT NOT NULL,
    \`transactionHash\` VARCHAR(500) NOT NULL,
    \`depositAmount\` DECIMAL(12,2) NOT NULL,
    \`currentAmount\` DECIMAL(12,2) NOT NULL,
    \`pricePerToken\` DECIMAL(12,2) NULL,
    \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`fk_wallet_deposit\`
          FOREIGN KEY (\`wallet_id\`)
          REFERENCES \`${DbTables.WALLET}\` (\`id\`)
          ON DELETE CASCADE
          ON UPDATE NO ACTION
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.WALLET_DEPOSIT}\`;
  `);
}

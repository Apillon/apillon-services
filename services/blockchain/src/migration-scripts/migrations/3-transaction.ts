import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.TRANSACTION_QUEUE}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`status\` INT NULL,
    \`nonce\` INT NOT NULL,
    \`address\` VARCHAR(50) NOT NULL,
    \`to\` VARCHAR(50) NULL,
    \`chain\` INT NOT NULL,
    \`chainType\` INT NOT NULL,
    \`transactionHash\` VARCHAR(500) NOT NULL,
    \`rawTransaction\` VARCHAR(100000) NOT NULL,
    \`transactionStatus\` INT NULL,
    \`referenceTable\` VARCHAR (50) NULL,
    \`referenceId\` VARCHAR (50) NULL,
    \`data\` VARCHAR (1000) NULL,
    \`webhookTriggered\` DATETIME NULL,
    \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`address_chain\` (\`transactionHash\`,\`chain\`,\`chainType\`)
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.TRANSACTION_QUEUE}\`;
  `);
}

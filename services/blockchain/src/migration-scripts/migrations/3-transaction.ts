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
    \`chain\` INT NOT NULL,
    \`transactionHash\` VARCHAR(500) NOT NULL,
    \`rawTransaction\` VARCHAR(1000) NOT NULL,
    \`referenceTable\` VARCHAR (50) NULL,
    \`referenceId\` INT NULL,
    \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`address_chain\` (\`transactionHash\`,\`chain\`)
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

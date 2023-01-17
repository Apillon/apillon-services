import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.TRANSACTION_QUEUE}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`nonce\` INT NOT NULL,
    \`address\` VARCHAR(50) NOT NULL,
    \`chain\` INT NOT NULL,
    \`tx_hash\` VARCHAR(500) NOT NULL,
    \`raw_transaction\` VARCHAR(1000) NOT NULL,
    \`reference_table\` VARCHAR (50) NULL,
    \`reference_id\` INT NULL,
    \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`address_chain\` (\`tx_hash\`,\`chain\`)
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

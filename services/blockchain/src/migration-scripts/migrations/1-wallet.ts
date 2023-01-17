import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.WALLET}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`status\` INT NULL,
    \`address\` VARCHAR(50) NOT NULL,
    \`chain\` INT NOT NULL,
    \`private_key\` VARCHAR(100) NOT NULL,
    \`next_nonce\` INT NULL DEFAULT 0,
    \`last_processed_nonce\` INT NULL DEFAULT -1,
    \`usage_timestamp\` DATETIME NULL,
    \`type\` INT NULL,
    \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`address_chain\` (\`address\`,\`chain\`)
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.WALLET}\`;
  `);
}

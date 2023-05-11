import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  // seed can be a private key for evm based chains
  // or mnemonic + derivation path for substrate chains like:
  // sample split bamboo west visual approve brain fox arch impact relief smile//Path1//alice
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.WALLET}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`status\` INT NULL,
    \`address\` VARCHAR(50) NOT NULL,
    \`chain\` INT NOT NULL,
    \`chainType\` INT NOT NULL,
    \`seed\` VARCHAR(120) NOT NULL,
    \`nextNonce\` INT NOT NULL DEFAULT 0,
    \`lastProcessedNonce\` INT NULL DEFAULT -1,
    \`lastParsedBlock\` INT NULL,
    \`blockParseSize\` INT NULL DEFAULT 50,
    \`usageTimestamp\` DATETIME NULL,
    \`type\` INT NULL,
    \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE INDEX \`address_chain\` (\`address\`,\`chain\`,\`chainType\`)
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

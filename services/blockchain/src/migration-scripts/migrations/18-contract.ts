import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  // seed can be a private key for evm based chains
  // or mnemonic + derivation path for substrate chains like:
  // sample split bamboo west visual approve brain fox arch impact relief smile//Path1//alice
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.CONTRACT}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`status\` INT NULL,
    \`address\` VARCHAR(50) NOT NULL,
    \`chain\` INT NOT NULL,
    \`chainType\` INT NOT NULL,
    \`abi\` TEXT NOT NULL,
    \`lastParsedBlock\` INT NULL DEFAULT 0,
    \`lastParsedBlockTime\` DATETIME NULL,
    \`lastParsedBlockUpdateTime\` DATETIME NULL,
    \`blockParseSize\` INT NULL DEFAULT 50,
    \`currentBalance\` DECIMAL(40,0) NULL,
    \`minBalance\` DECIMAL(40,0) NULL,
    \`lastBalanceAlertTime\` DATETIME NULL,
    \`decimals\` INT(3) NULL,
    \`token\` VARCHAR(10) NULL,
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
    DROP TABLE IF EXISTS \`${DbTables.CONTRACT}\`;
  `);
}

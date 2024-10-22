import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.MULTISIG_WALLET}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`status\` INT NULL,
      \`address\` VARCHAR(50) NOT NULL,
      \`chain\` INT NOT NULL,
      \`chainType\` INT NOT NULL,
      \`description\` VARCHAR(255) NOT NULL,
      \`signers\` VARCHAR(1000) NOT NULL,
      \`threshold\` INT NULL,
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
    DROP TABLE IF EXISTS \`${DbTables.MULTISIG_WALLET}\`;
  `);
}

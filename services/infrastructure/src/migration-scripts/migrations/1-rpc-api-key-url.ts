import { SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        CREATE TABLE IF NOT EXISTS \`${DbTables.RPC_API_KEY}\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,
            \`name\` VARCHAR(255) NOT NULL,
            \`description\` VARCHAR(1000),
            \`uuid\` VARCHAR(36) NOT NULL,
            \`status\` INT NOT NULL DEFAULT ${SqlModelStatus.ACTIVE},
            \`projectUuid\` VARCHAR(36) NOT NULL,
            \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
            \`createUser\` INT NULL,
            \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            \`updateUser\` INT NULL,
            PRIMARY KEY (\`id\`));
    `);
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.RPC_URL}\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(255) NOT NULL,
        \`chainName\` VARCHAR(255) NOT NULL,
        \`network\` VARCHAR(255) NOT NULL,
        \`httpsUrl\` VARCHAR(500) NOT NULL,
        \`wssUrl\` VARCHAR(500) NOT NULL,
        \`apiKeyId\` INT NOT NULL,
        \`status\` INT NOT NULL DEFAULT ${SqlModelStatus.ACTIVE},
        \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        \`createUser\` INT NULL,
        \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`updateUser\` INT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE (\`network\`, \`apiKeyId\`),
        CONSTRAINT \`fk_apiKeyIdId_rpc_api_key_id\`
        FOREIGN KEY (\`apiKeyId\`)
        REFERENCES \`${DbTables.RPC_API_KEY}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION);
    `);
}
export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        DROP TABLE IF EXISTS \`${DbTables.RPC_URL}\`;
    `);
  await queryFn(`
      DROP TABLE IF EXISTS \`${DbTables.RPC_API_KEY}\`;
    `);
}

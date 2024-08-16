import { SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.EMBEDDED_WALLET_INTEGRATION}\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
        \`project_uuid\` VARCHAR(36) NOT NULL,
        \`integration_uuid\` VARCHAR(36) NOT NULL,
        \`title\` VARCHAR(300) NOT NULL,
        \`description\` TEXT NULL,
        \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        \`createUser\` INT NULL,
        \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`updateUser\` INT NULL,
        PRIMARY KEY (\`id\`)
      );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.EMBEDDED_WALLET_INTEGRATION}\`;`);
}

import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.OAUTH_TOKEN_PAIR}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`status\` INT NULL,
      \`oauth_token\` VARCHAR(200) NULL,
      \`oauth_secret\` VARCHAR(200) NULL,
      \`_createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`_updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`_createUser\` INT NULL,
      \`_updateUser\` INT NULL,
      PRIMARY KEY (\`id\`));
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.OAUTH_TOKEN_PAIR}\`;
  `);
}

import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.TOKEN_CLAIM}\` (
      \`user_uuid\` VARCHAR(36) NOT NULL,
      \`wallet\` VARCHAR(42) NOT NULL,
      \`ip_address\` VARCHAR(50) NULL,
      \`fingerprint\` VARCHAR(50) NOT NULL,
      \`totalNctr\` INT NOT NULL DEFAULT 0,
      \`claimCompleted\` BOOLEAN NOT NULL DEFAULT FALSE,
      \`status\` INT NOT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`user_uuid\`)
    );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.TOKEN_CLAIM}\`;
  `);
}

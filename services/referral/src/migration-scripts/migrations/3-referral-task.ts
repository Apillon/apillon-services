import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.REFERRAL_TASK}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`name\` VARCHAR(45) NOT NULL,
      \`type\` INT NOT NULL,
      \`reward\` INT NOT NULL,
      \`available_from\` DATETIME NULL,
      \`available_to\` DATETIME NULL,
      \`content\` VARCHAR(300) NULL,
      \`status\` INT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`)
    );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.REFERRAL_TASK}\`;
  `);
}

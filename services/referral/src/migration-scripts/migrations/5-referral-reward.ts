import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.REFERRAL_REWARD}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`name\` VARCHAR(45) NOT NULL,
      \`description\` VARCHAR(300) NULL,
      \`image\` VARCHAR(100) NULL,
      \`supply\` INT NULL,
      \`quantity_per_referral\` INT NOT NULL,
      \`price\` INT NOT NULL,
      \`available_from\` DATETIME NULL,
      \`available_to\` DATETIME NULL,
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
    DROP TABLE IF EXISTS \`${DbTables.REFERRAL_REWARD}\`;
  `);
}

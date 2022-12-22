import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.PRODUCT}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`name\` VARCHAR(45) NULL,
      \`description\` VARCHAR(3000) NULL,
      \`imageUrl\` VARCHAR(500) NULL,
      \`price\` INT NOT NULL,
      \`stock\` INT NULL,
      \`maxOrderCount\` INT NULL,
      \`attributes\` JSON NULL,
      \`available_from\` DATETIME NULL,
      \`available_to\` DATETIME NULL,
      \`status\` INT NOT NULL,
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
    DROP TABLE IF EXISTS \`${DbTables.PRODUCT}\`;
  `);
}

import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.TASK}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`type\` INT NOT NULL,
      \`name\` VARCHAR(45) NULL,
      \`description\` VARCHAR(3000) NULL,
      \`reward\` INT NOT NULL,
      \`maxCompleted\` INT NULL,
      \`activeFrom\` DATETIME NULL,
      \`activeTo\` DATETIME NULL,
      \`data\` JSON NULL,
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
    DROP TABLE IF EXISTS \`${DbTables.TASK}\`;
  `);
}

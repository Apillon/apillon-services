import { DbTables } from '../../config/types';

// TODO: Check workers job for more parameters, if needed
export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.OASIS_SIGNATURE}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`status\` INT NULL,
      \`project_uuid\` VARCHAR(36) NOT NULL,
      \`dataHash\` VARCHAR(255) NOT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE (\`dataHash\`)
    );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.OASIS_SIGNATURE}\`;
  `);
}

import { DbTables } from '../../config/types';

// TODO: Check workers job for more parameters, if needed
export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.IDENTITY_JOB}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`retries\` INT NULL,
      \`currentStage\` TEXT NULL,
      \`finalStage\` TEXT NULL,
      \`identity_id\` INT NULL,
      \`completedAt\` DATETIME NULL,
      \`lastError\` TEXT NULL,
      \`lastFailed\` DATETIME NULL,
      \`status\` INT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_identity\`
        FOREIGN KEY (\`identity_id\`)
        REFERENCES \`${DbTables.IDENTITY}\` (\`id\`)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
  );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.IDENTITY_JOB}\`;
  `);
}

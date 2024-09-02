import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.CLOUD_FUNCTION}\`
    (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`function_uuid\` VARCHAR(36) NOT NULL,
      \`project_uuid\` VARCHAR(36) NOT NULL,
      \`encryption_key_uuid\` VARCHAR(36) NOT NULL,
      \`encrypted_variables\` TEXT NULL,
      \`activeJob_id\` INT NOT NULL,
      \`status\` INT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`description\` VARCHAR(255) NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY(\`id\`),
      CONSTRAINT \`fk_function_job\`
        FOREIGN KEY (\`activeJob_id\`)
        REFERENCES \`${DbTables.ACURAST_JOB}\` (\`id\`)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
    );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.CLOUD_FUNCTION}\`;
  `);
}

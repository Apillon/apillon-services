import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.BUCKET_WEBHOOK}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`bucket_id\` INT NOT NULL,
  \`url\` VARCHAR(500) NOT NULL,
  \`authMethod\` VARCHAR(255) NULL,
  \`param1\` VARCHAR(1000) NULL,
  \`param2\` VARCHAR(1000) NULL,
  \`status\` INT NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_webhoodData_bucket\`
        FOREIGN KEY (\`bucket_id\`)
        REFERENCES \`${DbTables.BUCKET}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.BUCKET_WEBHOOK}\`;
  `);
}

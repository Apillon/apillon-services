import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.DIRECTORY}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`directory_uuid\` VARCHAR(36) NOT NULL,
  \`parentDirectory_id\` INT NULL,
  \`bucket_id\` INT NOT NULL,
  \`CID\` VARCHAR(255) NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`description\` VARCHAR(1000) NULL,
  \`status\` INT NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE (directory_uuid),
  CONSTRAINT \`fk_directory_bucket\`
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
    DROP TABLE IF EXISTS \`${DbTables.DIRECTORY}\`;
  `);
}

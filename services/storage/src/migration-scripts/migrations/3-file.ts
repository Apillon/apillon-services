import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.FILE}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`CID\` VARCHAR(255) NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`extension\` VARCHAR(10) NOT NULL,
  \`contentType\` VARCHAR(100) NOT NULL,
  \`directory_id\` INT NULL,
  \`size\` INT NOT NULL,
  \`status\` INT NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_file_directory\`
        FOREIGN KEY (\`directory_id\`)
        REFERENCES \`${DbTables.DIRECTORY}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.FILE}\`;
  `);
}

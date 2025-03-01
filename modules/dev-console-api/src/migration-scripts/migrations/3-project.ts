import { DbTables } from '../../config/types';
import { SqlModelStatus } from '@apillon/lib';

export const upgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
  CREATE TABLE IF NOT EXISTS \`${DbTables.PROJECT}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`project_uuid\` VARCHAR(36) NOT NULL,
    \`name\` VARCHAR(500) NULL,
    \`shortDescription\` VARCHAR(1000) NULL,
    \`description\` TEXT NULL,
    \`imageFile_id\` INT NULL,
    \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
    \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE (project_uuid),
    CONSTRAINT \`fk_project_file\`
      FOREIGN KEY (\`imageFile_id\`)
      REFERENCES \`file\` (\`id\`)
      ON UPDATE NO ACTION
    )`);
};

export const downgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.PROJECT}\`;
  `);
};

import { DbTables } from '../../config/types';
import { SqlModelStatus } from '@apillon/lib';

export const upgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(
    `ALTER TABLE ${DbTables.PROJECT} DROP CONSTRAINT \`fk_project_file\`;`,
  );
  await queryFn(`DROP TABLE IF EXISTS \`file\`;`);
  await queryFn(`DROP TABLE IF EXISTS \`instruction\`;`);
};

export const downgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`file\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`name\` VARCHAR(100) NULL,
      \`extension\` VARCHAR(100) NULL,
      \`contentType\` VARCHAR(100) NULL,
      \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
      \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`))
  `);

  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`instruction\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`instructionType\` INT NOT NULL,
      \`title\` VARCHAR(250) NULL,
      \`htmlContent\` TEXT NOT NULL,
      \`extendedHtmlContent\` TEXT NULL,
      \`docsUrl\` VARCHAR(500) NULL,
      \`forRoute\` VARCHAR(200) NULL,
      \`expanded\` BOOLEAN DEFAULT 1,
      \`sortId\` INT NULL,
      \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
      \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`))
  `);
};

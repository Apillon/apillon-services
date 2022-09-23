import { SqlModelStatus } from 'at-lib';

import { DbTables } from '../../config/types';

export const upgrade = async (queryFn: (query: string, values?: any[]) => Promise<any[]>): Promise<void> => {
  await queryFn(`
  CREATE TABLE IF NOT EXISTS \`${DbTables.INSTRUCTION}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`instructionType\` INT NOT NULL,
    \`title\` VARCHAR(45) NULL,
    \`htmlContent\` TEXT NOT NULL,
    \`extendedHtmlContent\` TEXT NOT NULL,
    \`docsUrl\` VARCHAR(500) NULL,
    \`instructionEnum\` VARCHAR(100) NULL,
    \`forRoute\` VARCHAR(200) NULL,
    \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
    \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`))
  `);
};

export const downgrade = async (queryFn: (query: string, values?: any[]) => Promise<any[]>): Promise<void> => {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.INSTRUCTION}\`;
  `);
};

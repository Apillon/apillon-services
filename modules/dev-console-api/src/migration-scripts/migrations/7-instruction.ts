import { SqlModelStatus } from '@apillon/lib';

import { DbTables } from '../../config/types';

export const upgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
  CREATE TABLE IF NOT EXISTS \`${DbTables.INSTRUCTION}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`instructionEnum\` VARCHAR(100) NOT NULL,
    \`instructionType\` INT NOT NULL,
    \`title\` VARCHAR(250) NULL,
    \`htmlContent\` TEXT NOT NULL,
    \`extendedHtmlContent\` TEXT NULL,
    \`docsUrl\` VARCHAR(500) NULL,
    \`forRoute\` VARCHAR(200) NULL,
    \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
    \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`))
  `);
};

export const downgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.INSTRUCTION}\`;
  `);
};

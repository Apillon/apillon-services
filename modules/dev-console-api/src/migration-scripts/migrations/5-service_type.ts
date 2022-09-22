import { DbTables } from '../../config/types';
import { SqlModelStatus } from 'at-lib';

export const upgrade = async (queryFn: (query: string, values?: any[]) => Promise<any[]>): Promise<void> => {
  await queryFn(`
  CREATE TABLE IF NOT EXISTS \`${DbTables.SERVICE_TYPE}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(500) NULL,
    \`description\` TEXT NULL,
    \`active\` BOOLEAN DEFAULT 0,
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
    DROP TABLE IF EXISTS \`${DbTables.SERVICE_TYPE}\`;
  `);
};

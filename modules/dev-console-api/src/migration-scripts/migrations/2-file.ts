import { SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../../config/types';

export const upgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.FILE}\` (
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
};

export const downgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.FILE}\`;
  `);
};

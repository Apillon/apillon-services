import { DbTables } from '../../config/types';
import { SqlModelStatus } from '@apillon/lib';
export const upgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(
    `CREATE TABLE ${DbTables.NOTIFICATION} (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`type\` INT,
        \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
        \`message\` TEXT NULL,
        \`userId\` INT NULL,
        \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`createUser\` INT NULL,
        \`updateUser\` INT NULL,
        PRIMARY KEY (\`id\`)
    );`,
  );
};
export const downgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`DROP TABLE IF EXISTS ${DbTables.NOTIFICATION};`);
};

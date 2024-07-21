import { DbTables } from '../../config/types';
import { SqlModelStatus } from '@apillon/lib';

export const upgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(
    `CREATE TABLE ${DbTables.SERVICE_STATUS} (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`message\` VARCHAR(500) NOT NULL,
        \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
        \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`createUser\` INT NULL,
        \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`updateUser\` INT NULL,
        \`url\` VARCHAR(500),
        \`type\` INT NOT NULL, 
        PRIMARY KEY (\`id\`),
        FOREIGN KEY (\`createUser\`) REFERENCES user(\`id\`) ON DELETE SET NULL,
        FOREIGN KEY (\`updateUser\`) REFERENCES user(\`id\`) ON DELETE SET NULL
    );`,
  );
};

export const downgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`DROP TABLE IF EXISTS ${DbTables.SERVICE_STATUS};`);
};

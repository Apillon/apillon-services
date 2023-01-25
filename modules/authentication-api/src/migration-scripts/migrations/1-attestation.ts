import { IdentityState, DbTables } from '../../config/types';
import { SqlModelStatus } from '@apillon/lib';

export const upgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
  CREATE TABLE IF NOT EXISTS \`${DbTables.IDENTITY}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`email\` VARCHAR(100) NOT NULL,
    \`didUri\` VARCHAR(48) NOT NULL,
    \`state\` VARCHAR(25) NOT NULL DEFAULT '${IdentityState.PENDING_VERIFICATION}',
    \`token\` VARCHAR(225) NULL,
    \`credential\` JSON  NULL,
    \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
    \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE (email)
  )`);
};

export const downgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.IDENTITY}\`;
  `);
};

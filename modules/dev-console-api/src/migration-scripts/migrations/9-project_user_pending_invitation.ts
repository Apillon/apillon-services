import { DbTables } from '../../config/types';
import { SqlModelStatus } from '@apillon/lib';

export const upgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
  CREATE TABLE IF NOT EXISTS \`${DbTables.PROJECT_USER_PENDING_INVITATION}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`project_id\` INT NOT NULL,
    \`email\` VARCHAR(100) NOT NULL,
    \`role_id\` INT NOT NULL,
    \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
    \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`fk_projectUserPendingInvitation_project\`
        FOREIGN KEY (\`project_id\`)
        REFERENCES \`${DbTables.PROJECT}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
  )`);
};

export const downgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.PROJECT_USER_PENDING_INVITATION}\`;
  `);
};

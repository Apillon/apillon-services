import { DbTables } from '../../config/types';
import { SqlModelStatus } from 'at-lib';

export const upgrade = async (queryFn: (query: string, values?: any[]) => Promise<any[]>): Promise<void> => {
  await queryFn(`
  CREATE TABLE IF NOT EXISTS \`${DbTables.PROJECT_USER}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`project_id\` INT NOT NULL,
    \`user_id\` INT NOT NULL,
    \`pendingInvitation\` BOOLEAN NOT NULL,
    \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
    \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`fk_projectUser_project\`
        FOREIGN KEY (\`project_id\`)
        REFERENCES \`${DbTables.PROJECT}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    CONSTRAINT \`fk_projectUser_user\`
        FOREIGN KEY (\`user_id\`)
        REFERENCES \`${DbTables.USER}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION)
  `);
};

export const downgrade = async (queryFn: (query: string, values?: any[]) => Promise<any[]>): Promise<void> => {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.PROJECT_USER}\`;
  `);
};

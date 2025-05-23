import { DbTables } from '../../config/types';
import { SqlModelStatus } from '@apillon/lib';

export const upgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
  CREATE TABLE IF NOT EXISTS \`project_api_key\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`project_id\` INT NOT NULL,
    \`key\` VARCHAR(250) NOT NULL,
    \`name\` VARCHAR(500) NULL,
    \`testNetwork\` BOOLEAN DEFAULT 0,
    \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
    \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`fk_projectApiKey_project\`
        FOREIGN KEY (\`project_id\`)
        REFERENCES \`${DbTables.PROJECT}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION)
  `);
};

export const downgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`
    DROP TABLE IF EXISTS \`project_api_key\`;
  `);
};

import { DbTables } from '../../config/types';
import { SqlModelStatus } from 'at-lib';

export const upgrade = async (queryFn: (query: string, values?: any[]) => Promise<any[]>): Promise<void> => {
  await queryFn(`
  CREATE TABLE IF NOT EXISTS \`${DbTables.SERVICE}\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`project_id\` INT NOT NULL,
    \`service_uuid\` VARCHAR(36) NOT NULL,
    \`serviceType_id\` INT NOT NULL,
    \`name\` VARCHAR(500) NULL,
    \`testNetwork\` BOOLEAN DEFAULT 0,
    \`description\` TEXT NULL,
    \`active\` BOOLEAN DEFAULT 1,
    \`lastStartTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    \`status\` INT NOT NULL DEFAULT '${SqlModelStatus.ACTIVE}',
    \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`fk_service_serviceType\`
        FOREIGN KEY (\`serviceType_id\`)
        REFERENCES \`${DbTables.SERVICE_TYPE}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    CONSTRAINT \`fk_service_project\`
        FOREIGN KEY (\`project_id\`)
        REFERENCES \`${DbTables.PROJECT}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION)
  `);
};

export const downgrade = async (queryFn: (query: string, values?: any[]) => Promise<any[]>): Promise<void> => {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.SERVICE}\`;
  `);
};

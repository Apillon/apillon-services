import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.DEPLOYMENT_BUILD}\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`deploymentUuid\` VARCHAR(36) NULL,
      \`status\` INT NULL,
      \`buildStatus\` INT NOT NULL,
      \`logs\` TEXT NULL,
      \`websiteUuid\` VARCHAR(36) NOT NULL,
      \`finishedTime\` DATETIME NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL

    )`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`DROP TABLE IF EXISTS \`${DbTables.DEPLOYMENT_BUILD}\``);
}

import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.DEPLOYMENT_CONFIG}\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`repoId\` INT NOT NULL,
      \`branchName\` VARCHAR(500) NOT NULL,
      \`websiteUuid\` VARCHAR(36) NOT NULL,
      \`accessToken\` VARCHAR(500) NOT NULL,
      \`buildCommand\` VARCHAR(500)  NULL,
      \`buildDirectory\` VARCHAR(500) NOT NULL,
      \`installCommand\` VARCHAR(500)  NULL,
      \`apiKey\` VARCHAR(36) NOT NULL,
      \`apiSecret\` VARCHAR(90) NOT NULL,
      \`status\` INT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL
    )
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`DROP TABLE IF EXISTS \`${DbTables.DEPLOYMENT_CONFIG}\``);
}

import { SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
  CREATE TABLE IF NOT EXISTS \`${DbTables.GITHUB_PROJECT_CONFIG}\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`project_uuid\` VARCHAR(36) NOT NULL,
    \`refresh_token\` VARCHAR(100) NULL,
    \`access_token\` VARCHAR(100) NOT NULL,
    \`username\` VARCHAR(50) NOT NULL,
    \`status\` INT NOT NULL DEFAULT ${SqlModelStatus.ACTIVE},
    \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL
  )`);

  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.DEPLOYMENT_CONFIG}\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`repoId\` INT NOT NULL,
      \`repoName\` VARCHAR(500) NOT NULL,
      \`repoOwnerName\` VARCHAR(500) NOT NULL,
      \`hookId\` INT NOT NULL,
      \`encryptedVariables\` TEXT NULL,
      \`projectConfigId\` INT NOT NULL,
      \`branchName\` VARCHAR(500) NOT NULL,
      \`websiteUuid\` VARCHAR(36) NOT NULL,
      \`buildCommand\` VARCHAR(500)  NULL,
      \`buildDirectory\` VARCHAR(500) NOT NULL,
      \`installCommand\` VARCHAR(500)  NULL,
      \`apiKey\` VARCHAR(36) NOT NULL,
      \`apiSecret\` VARCHAR(255) NOT NULL,
      \`status\` INT NOT NULL DEFAULT ${SqlModelStatus.ACTIVE},
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      FOREIGN KEY (\`projectConfigId\`) REFERENCES \`${DbTables.GITHUB_PROJECT_CONFIG}\` (\`id\`)
    )
    `);

  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.DEPLOYMENT_BUILD}\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`deploymentUuid\` VARCHAR(36) NULL,
      \`deploymentConfigId\` INT NOT NULL,
      \`status\` INT NOT NULL DEFAULT ${SqlModelStatus.ACTIVE},
      \`buildStatus\` INT NOT NULL,
      \`logs\` TEXT NULL,
      \`websiteUuid\` VARCHAR(36) NOT NULL,
      \`finishedTime\` DATETIME NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      FOREIGN KEY (\`deploymentConfigId\`) REFERENCES \`${DbTables.DEPLOYMENT_CONFIG}\` (\`id\`)

    )`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`DROP TABLE IF EXISTS \`${DbTables.DEPLOYMENT_BUILD}\``);
  await queryFn(`DROP TABLE IF EXISTS \`${DbTables.DEPLOYMENT_CONFIG}\``);
  await queryFn(`DROP TABLE IF EXISTS \`${DbTables.GITHUB_PROJECT_CONFIG}\``);
}

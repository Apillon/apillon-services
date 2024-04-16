import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS collection_metadata (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`status\` INT NULL,
  \`collection_uuid\` VARCHAR(36) NOT NULL,
  \`bucket_uuid\` VARCHAR(36) NOT NULL,
  \`imagesSession\` VARCHAR(36) NOT NULL,
  \`metadataSession\` VARCHAR(36) NOT NULL,
  \`useApillonIpfsGateway\` BOOLEAN DEFAULT 1,
  \`ipnsId\` INT NULL,
  \`currentStep\` INT NULL,
  \`lastError\` TEXT NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`)
  )`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS collection_metadata;
  `);
}

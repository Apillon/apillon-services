import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.COLLECTION}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`collection_uuid\` VARCHAR(36) NOT NULL,
  \`project_uuid\` VARCHAR(36) NOT NULL,
  \`symbol\` VARCHAR(8) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`description\` VARCHAR(1000) NULL,
  \`maxSupply\` BIGINT NOT NULL,
  \`mintPrice\` DECIMAL NOT NULL,
  \`bucket_uuid\` VARCHAR(36) NULL,
  \`baseUri\` VARCHAR(500) NOT NULL,
  \`baseExtension\` VARCHAR(500) NOT NULL,
  \`isDrop\` BOOLEAN NOT NULL,
  \`isSoulbound\` BOOLEAN NOT NULL,
  \`isRevokable\` BOOLEAN NOT NULL,
  \`dropStart\` INT NOT NULL,
  \`reserve\` INT NOT NULL,
  \`royaltiesFees\` INT NOT NULL,
  \`royaltiesAddress\` VARCHAR(50) NOT NULL,
  \`collectionStatus\` INT NOT NULL,
  \`contractAddress\` VARCHAR(255) NULL,
  \`transactionHash\` VARCHAR(255) NULL,
  \`status\` INT NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`)
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.COLLECTION}\`;
  `);
}

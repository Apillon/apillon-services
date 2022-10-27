import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.BUCKET}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`bucket_uuid\` VARCHAR(36) NOT NULL,
  \`project_uuid\` VARCHAR(36) NOT NULL,
  \`bucketType\` INT NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`description\` VARCHAR(1000) NULL,
  \`maxSize\` BIGINT NOT NULL,
  \`CID\` VARCHAR(255) NULL,
  \`IPNS\` VARCHAR(255) NULL,
  \`size\` BIGINT NULL,
  \`status\` INT NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE (bucket_uuid)
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.BUCKET}\`;
  `);
}

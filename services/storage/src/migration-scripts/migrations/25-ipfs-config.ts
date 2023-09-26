import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.IPFS_CONFIG}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`status\` INT NULL,
  \`project_uuid\` VARCHAR(36) NOT NULL,
  \`ipfsApi\` VARCHAR(1000) NOT NULL,
  \`ipfsGateway\` VARCHAR(1000) NOT NULL,
  \`clusterServer\` VARCHAR(1000) NULL,
  \`private\` BOOLEAN NULL DEFAULT 1,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE (project_uuid)
  )`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.IPFS_CONFIG}\`;
  `);
}

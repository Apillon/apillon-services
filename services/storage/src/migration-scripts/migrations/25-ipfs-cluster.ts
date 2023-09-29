import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.IPFS_CLUSTER}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`status\` INT NULL,
  \`clusterServer\` VARCHAR(1000) NULL,
  \`ipfsApi\` VARCHAR(1000) NOT NULL,
  \`ipfsGateway\` VARCHAR(1000) NOT NULL,
  \`ipnsGateway\` VARCHAR(1000) NOT NULL,
  \`subdomainGateway\` VARCHAR(1000) NOT NULL,
  \`domain\` VARCHAR(1000) NOT NULL,
  \`private\` BOOLEAN NULL DEFAULT 1,
  \`region\` VARCHAR(255) NOT NULL,
  \`cloudProvider\` VARCHAR(255) NOT NULL,
  \`performanceLevel\` INT NULL,
  \`isDefault\` BOOLEAN NOT NULL,
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
    DROP TABLE IF EXISTS \`${DbTables.IPFS_CLUSTER}\`;
  `);
}

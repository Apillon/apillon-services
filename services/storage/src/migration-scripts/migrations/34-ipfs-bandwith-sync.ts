import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.IPFS_BANDWIDTH_SYNC}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`status\` INT NULL,
  \`ipfsTrafficFrom\` DATETIME NOT NULL,
  \`ipfsTrafficTo\` DATETIME NOT NULL,
  \`message\` TEXT NULL,
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
    DROP TABLE IF EXISTS \`${DbTables.IPFS_BANDWIDTH_SYNC}\`;
  `);
}

import { SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.PRODUCT_HUNT_COMMENT}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`user_uuid\` VARCHAR(36) NOT NULL,
      \`username\` VARCHAR(255) NOT NULL,
      \`url\` VARCHAR(500) NOT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`status\` INT NOT NULL DEFAULT ${SqlModelStatus.ACTIVE},
      \`createUser\` INT NULL,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`));`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`DROP TABLE IF EXISTS \`${DbTables.PRODUCT_HUNT_COMMENT}\`;`);
}

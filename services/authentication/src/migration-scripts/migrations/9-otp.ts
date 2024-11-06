import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.OTP}\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,
            \`email\` VARCHAR(300) NOT NULL,
            \`code\` VARCHAR(6) NOT NULL,
            \`expireTime\` DATETIME NOT NULL,
            \`used\` BOOLEAN NOT NULL DEFAULT FALSE, 
            \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
            \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
          );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.OTP}\`;`);
}

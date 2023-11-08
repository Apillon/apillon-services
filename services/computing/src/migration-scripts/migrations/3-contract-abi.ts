import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.CONTRACT_ABI}\`
      (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`status\` INT NULL,

        \`contractType\` INT NOT NULL,
        \`version\` INT NOT NULL,
        \`abi\` JSON NOT NULL,

        \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        \`createUser\` INT NULL,
        \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
        \`updateUser\` INT NULL,
        PRIMARY KEY (\`id\`)
      );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.CONTRACT_ABI}\`;
  `);
}

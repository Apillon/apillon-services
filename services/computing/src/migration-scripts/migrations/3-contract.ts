import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.CONTRACT}\`
    (
      \`id\`
      INT
      NOT
      NULL
      AUTO_INCREMENT,
      \`contract_uuid\`
      VARCHAR
    (
      36
    ) NOT NULL,
      \`project_uuid\` VARCHAR
    (
      36
    ) NOT NULL,
      \`name\` VARCHAR
    (
      255
    ) NOT NULL,
      \`description\` VARCHAR
    (
      255
    ) NULL,
      \`contractType\` INT NOT NULL,
      \`data\` JSON NULL,
      \`contractStatus\` INT NOT NULL,
      \`sourceHash\` CHAR
    (
      70
    ) NULL,
      \`contractAddress\` CHAR
    (
      66
    ) NULL,
      \`deployerAddress\` CHAR
    (
      50
    ) NULL,
      \`transactionHash\` CHAR
    (
      66
    ) NULL,
      \`status\` INT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY
    (
      \`id\`
    )
      );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.CONTRACT}\`;
  `);
}

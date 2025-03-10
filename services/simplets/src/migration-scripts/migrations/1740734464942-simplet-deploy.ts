import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.SIMPLET_DEPLOY}\`
    (
      \`id\`
      INT
      NOT
      NULL
      AUTO_INCREMENT,
      \`status\`
      INT
      NULL,
      \`project_uuid\`
      VARCHAR
     (
      36
     ) NOT NULL,

      \`simpletDeployed_uuid\` VARCHAR
     (
       36
     ) NOT NULL,
      \`simplet_uuid\` VARCHAR
     (
       36
     ) NOT NULL,
      \`name\` VARCHAR
     (
       255
     ) NOT NULL,
      \`description\` VARCHAR
     (
       1000
     ) NULL,

      \`contract_uuid\` VARCHAR
     (
       36
     ) NULL,
      \`contractStatus\` INT NULL,
      \`contractChainType\` INT NULL,
      \`contractChain\` INT NULL,
      \`contractAddress\` CHAR
     (
       42
     ) NULL,

      \`backend_uuid\` VARCHAR
     (
       36
     ) NULL,
      \`backendStatus\` INT NULL,
      \`backendUrl\` VARCHAR
     (
       255
     ) NULL,

      \`frontend_uuid\` VARCHAR
     (
       36
     ) NULL,
      \`frontendStatus\` INT NULL,

      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY
     (
       \`id\`
     ),
      CONSTRAINT unique_simplet_deploy_uuid UNIQUE
     (
       \`simpletDeployed_uuid\`
     )
      );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.SIMPLET_DEPLOY}\`;
  `);
}

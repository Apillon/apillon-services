import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.CONTRACT_DEPLOY}\`
    (
      \`id\`                   INT           NOT NULL AUTO_INCREMENT,
      \`contract_uuid\`        VARCHAR(36)   NOT NULL,
      \`status\`               INT           NULL,
      \`project_uuid\`         VARCHAR(36)   NOT NULL,

      \`chainType\`            INT           NOT NULL,
      \`chain\`                INT           NOT NULL,
      \`version_id\`           INT           NULL,
      \`custom_bytecode\`      VARCHAR(255)  NULL,
      \`custom_abi\`           JSON          NULL,
      \`constructorArguments\` JSON          NOT NULL,

      \`name\`                 VARCHAR(255)  NOT NULL,
      \`description\`          VARCHAR(1000) NULL,
      \`contractStatus\`       INT           NOT NULL,
      \`contractAddress\`      CHAR(42)      NULL,
      \`deployerAddress\`      CHAR(42)      NULL,
      \`transactionHash\`      CHAR(66)      NULL,

      \`createTime\`           DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\`           INT           NULL,
      \`updateTime\`           DATETIME      NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\`           INT           NULL,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_contract_deploy_contract_version\`
        FOREIGN KEY (\`version_id\`)
          REFERENCES \`${DbTables.CONTRACT_VERSION}\` (\`id\`)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION
    );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.CONTRACT_DEPLOY}\`;
  `);
}

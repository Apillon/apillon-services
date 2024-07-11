import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.CONTRACT}\`
     (
       \`id\`            INT           NOT NULL AUTO_INCREMENT,
       \`contract_uuid\` VARCHAR(36)   NOT NULL,
       \`status\`        INT           NULL,

       \`contractType\`  INT           NOT NULL,
       \`chainType\`     INT           NOT NULL,
       \`name\`          VARCHAR(255)  NOT NULL,
       \`description\`   VARCHAR(1000) NULL,

       \`createTime\`    DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
       \`createUser\`    INT           NULL,
       \`updateTime\`    DATETIME      NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       \`updateUser\`    INT           NULL,

       PRIMARY KEY (\`id\`),
       CONSTRAINT unique_contract_uuid UNIQUE (contract_uuid),
       UNIQUE KEY \`contract_version_unique_key\` (\`contractType\`, \`chainType\`, \`name\`)
     );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.CONTRACT}\`;
  `);
}

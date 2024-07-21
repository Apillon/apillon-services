import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.CONTRACT_VERSION_METHOD}\`
    (
      \`id\`                  INT           NOT NULL AUTO_INCREMENT,
      \`contract_version_id\` INT           NOT NULL,
      \`status\`              INT           NULL,

      \`onlyOwner\`           TINYINT(1)    NULL,
      \`name\`                VARCHAR(255)  NOT NULL,
      \`description\`         VARCHAR(1000) NULL,


      \`createTime\`          DATETIME      NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\`          INT           NULL,
      \`updateTime\`          DATETIME      NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\`          INT           NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`contract_method\` (\`contract_version_id\`, \`name\`),
      CONSTRAINT \`fk_contract_version_contract_version_methods\`
        FOREIGN KEY (\`contract_version_id\`)
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
    DROP TABLE IF EXISTS \`${DbTables.CONTRACT_VERSION_METHOD}\`;
  `);
}

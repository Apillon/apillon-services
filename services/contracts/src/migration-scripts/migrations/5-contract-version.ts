import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.CONTRACT_VERSION}\`
     (
       \`id\`          INT      NOT NULL AUTO_INCREMENT,
       \`status\`      INT      NULL,

       \`contract_id\` INT      NOT NULL,
       \`version\`     INT      NOT NULL,
       \`abi\`         JSON     NOT NULL,
       \`bytecode\`    TEXT     NOT NULL,

       \`createTime\`  DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
       \`createUser\`  INT      NULL,
       \`updateTime\`  DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       \`updateUser\`  INT      NULL,

       PRIMARY KEY (\`id\`),
       UNIQUE KEY \`contract_id_version_unique_key\` (\`contract_id\`, \`version\`),
       CONSTRAINT \`fk_contract_contract_version\`
         FOREIGN KEY (\`contract_id\`)
           REFERENCES \`${DbTables.CONTRACT}\` (\`id\`)
           ON DELETE NO ACTION
           ON UPDATE NO ACTION

     );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.CONTRACT_VERSION}\`;
  `);
}

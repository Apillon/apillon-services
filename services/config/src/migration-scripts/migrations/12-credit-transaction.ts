import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.CREDIT_TRANSACTION}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`project_uuid\` VARCHAR(36) NULL,
      \`credit_id\` INT NOT NULL,
      \`product_id\` INT NULL,
      \`direction\` INT NOT NULL,
      \`amount\` INT NOT NULL,
      \`referenceTable\` VARCHAR (50) NULL,
      \`referenceId\` VARCHAR (50) NULL,
      \`data\` VARCHAR (1000) NULL,
      \`status\` INT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` VARCHAR(36) NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` VARCHAR(36) NULL,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_ct_credit\`
            FOREIGN KEY (\`credit_id\`)
            REFERENCES \`${DbTables.CREDIT}\` (\`id\`)
            ON DELETE CASCADE
            ON UPDATE NO ACTION,
      CONSTRAINT \`fk_ct_product\`
            FOREIGN KEY (\`product_id\`)
            REFERENCES \`${DbTables.PRODUCT}\` (\`id\`)
            ON DELETE CASCADE
            ON UPDATE NO ACTION 
      
            );
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
      DROP TABLE IF EXISTS \`${DbTables.CREDIT_TRANSACTION}\`;
    `);
}

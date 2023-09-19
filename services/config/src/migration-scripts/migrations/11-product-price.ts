import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.PRODUCT_PRICE}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`product_id\` INT NOT NULL,
      \`price\` INT NOT NULL,
      \`validFrom\` DATETIME NULL,
      \`status\` INT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` VARCHAR(36) NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` VARCHAR(36) NULL,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_productPrice_product\`
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
      DROP TABLE IF EXISTS \`${DbTables.PRODUCT_PRICE}\`;
    `);
}

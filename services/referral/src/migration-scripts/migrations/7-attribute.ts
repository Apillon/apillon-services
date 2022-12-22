import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.ATTRIBUTE}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`product_id\` INT NOT NULL,
      \`inputType\` INT NULL,
      \`maxOrderCount\` INT NULL,
      \`options\` JSON NULL,
      \`name\` VARCHAR(45) NULL,
      \`description\` VARCHAR(3000) NULL,
      \`status\` INT NOT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_attribute_product\`
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
    DROP TABLE IF EXISTS \`${DbTables.ATTRIBUTE}\`;
  `);
}

import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.PROMO_CODE_USER}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`user_uuid\` VARCHAR(36) NOT NULL,
      \`user_email\` VARCHAR(100) NOT NULL,
      \`code_id\` INT NOT NULL,
      \`status\` INT NOT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE (user_uuid),
      UNIQUE (user_email),
      CONSTRAINT \`fk_promo_code\`
        FOREIGN KEY (\`code_id\`)
        REFERENCES \`${DbTables.PROMO_CODE}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.PROMO_CODE_USER}\`;
  `);
}

import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.REFERRAL_REFERRED}\` (
      \`user_id\` INT NOT NULL,
      \`referral_id\` INT NOT NULL,
      \`user_referral_id\` INT NOT NULL,
      \`status\` INT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_referral_referred_referral\`
        FOREIGN KEY (\`referral_id\`)
        REFERENCES \`${DbTables.REFERRAL}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.REFERRAL_REFERRED}\`;
  `);
}

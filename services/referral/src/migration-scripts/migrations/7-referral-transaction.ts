import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.REFERRAL_TRANSACTION}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`referral_id\` INT NOT NULL,
      \`direction\` INT NOT NULL,
      \`amount\` INT NOT NULL,
      \`reference_id\` INT NOT NULL,
      \`reference_type\` INT NOT NULL,
      \`status\` INT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_referral_transation_referral\`
        FOREIGN KEY (\`referral_id\`)
        REFERENCES \`${DbTables.REFERRAL}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.REFERRAL_TRANSACTION}\`;
  `);
}

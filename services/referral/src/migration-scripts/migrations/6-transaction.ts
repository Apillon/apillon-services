import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.TRANSACTION}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`player_id\` INT NOT NULL,
      \`direction\` INT NOT NULL,
      \`amount\` INT NOT NULL,
      \`realization_id\` INT NULL,
      \`status\` INT NOT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_referral_transation_player\`
        FOREIGN KEY (\`player_id\`)
        REFERENCES \`${DbTables.PLAYER}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.TRANSACTION}\`;
  `);
}

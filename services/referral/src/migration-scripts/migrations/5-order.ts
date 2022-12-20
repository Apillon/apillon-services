import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `CREATE TABLE IF NOT EXISTS \`${DbTables.ORDER}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`product_id\` INT NOT NULL,
      \`player_id\` INT NOT NULL,
      \`transaction_id\` INT NOT NULL,
      \`volume\` INT NOT NULL,
      \`price\` INT NOT NULL,
      \`totalCost\` INT NOT NULL,
      \`info\` JSON NULL,
      \`status\` INT NOT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_referral_referral_reward_product\`
        FOREIGN KEY (\`product_id\`)
        REFERENCES \`${DbTables.PRODUCT}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
      CONSTRAINT \`fk_referral_referral_reward_player\`
        FOREIGN KEY (\`player_id\`)
        REFERENCES \`${DbTables.PLAYER}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
      CONSTRAINT \`fk_referral_referral_reward_transaction\`
        FOREIGN KEY (\`transaction_id\`)
        REFERENCES \`${DbTables.TRANSACTION}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    );`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.ORDER}\`;
  `);
}

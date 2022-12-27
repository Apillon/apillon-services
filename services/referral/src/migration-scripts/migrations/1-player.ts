import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.PLAYER}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`user_uuid\` VARCHAR(36) NOT NULL,
      \`refCode\` VARCHAR(45) NOT NULL,
      \`shippingInfo\` JSON NULL,
      \`referrer_id\` INT NULL,
      \`twitter_id\` VARCHAR(45) NULL,
      \`github_id\` VARCHAR(45) NULL,
      \`termsAccepted\` DATETIME NULL,
      \`status\` INT NOT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE (refCode),
      CONSTRAINT \`fk_player_player\`
        FOREIGN KEY (\`referrer_id\`)
        REFERENCES \`${DbTables.PLAYER}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.PLAYER}\`;
  `);
}

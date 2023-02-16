import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.OAUTH_LINK}\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`authUser_id\` INT NOT NULL,
      \`type\` INT NOT NULL,
      \`status\` INT NULL,
      \`externalUserId\` VARCHAR(200) NOT NULL,
      \`externalUsername\` VARCHAR(200) NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_oauthLink_authUser\`
      FOREIGN KEY (\`authUser_id\`)
      REFERENCES \`${DbTables.AUTH_USER}\` (\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION);
  `);

  await queryFn(`
    ALTER TABLE  \`${DbTables.OAUTH_LINK}\` ADD UNIQUE \`unq_oauth_link\` (\`externalUserId\`, \`type\`);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.OAUTH_LINK}\`;
  `);
}

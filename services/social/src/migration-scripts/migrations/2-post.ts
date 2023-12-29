import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.POST}\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`status\` INT NULL,
  \`post_uuid\` VARCHAR(36) NOT NULL,
  \`space_id\` INT NOT NULL,
  \`project_uuid\` VARCHAR(36) NOT NULL,
  \`postType\` INT NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`body\` VARCHAR(1000) NULL,
  \`image\` VARCHAR(255) NULL,
  \`tags\` VARCHAR(255) NULL,
  \`postId\` VARCHAR(255) NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE (post_uuid),
  CONSTRAINT \`fk_post_space\`
        FOREIGN KEY (\`space_id\`)
        REFERENCES \`${DbTables.SPACE}\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.POST}\`;
  `);
}

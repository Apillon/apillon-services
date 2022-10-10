export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`authUser_role\` (
      \`role_id\` INT NOT NULL,
      \`authUser_id\` INT NOT NULL,
      \`project_uuid\` VARCHAR(36) NOT NULL,
      \`status\` INT NULL,
      \`user_uuid\` VARCHAR(36) NOT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`authUser_id\`, \`role_id\`, \`project_uuid\`),
      CONSTRAINT \`fk_authUser_role_authUser\`
        FOREIGN KEY (\`authUser_id\`)
        REFERENCES \`authUser\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
      CONSTRAINT \`fk_authUser_role_role1\`
        FOREIGN KEY (\`role_id\`)
        REFERENCES \`role\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`authUser_role\`;
  `);
}

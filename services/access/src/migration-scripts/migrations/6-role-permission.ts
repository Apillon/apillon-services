export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`role_permission\` (
      \`role_id\` INT NOT NULL,
      \`permission_id\` INT NOT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`role_id\`, \`permission_id\`),
      CONSTRAINT \`fk_role_permission_role1\`
        FOREIGN KEY (\`role_id\`)
        REFERENCES \`role\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
      CONSTRAINT \`fk_role_permission_permission1\`
        FOREIGN KEY (\`permission_id\`)
        REFERENCES \`permission\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`role_permission\`;
  `);
}

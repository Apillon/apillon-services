export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`apiKey_role\` (
      \`apiKey_id\` INT NOT NULL AUTO_INCREMENT,
      \`role_id\` INT NOT NULL,
      \`service_uuid\` VARCHAR(36) NOT NULL,
      \`project_uuid\` VARCHAR(36) NOT NULL,
      \`status\` INT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` INT NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` INT NULL,
      PRIMARY KEY (\`apiKey_id\`, \`role_id\`, \`service_uuid\`),
      INDEX \`fk_apiKey_role_role1_idx\` (\`role_id\` ASC) VISIBLE,
      CONSTRAINT \`fk_apiKey_role_apiKey1\`
        FOREIGN KEY (\`apiKey_id\`)
        REFERENCES \`apiKey\` (\`id\`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
      CONSTRAINT \`fk_apiKey_role_role1\`
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
    DROP TABLE IF EXISTS \`apiKey_role\`;
  `);
}

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`authUser\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`status\` INT NULL,
  \`user_uuid\` VARCHAR(36) NULL,
  \`password\` VARCHAR(300) NULL,
  \`email\` VARCHAR(100) NULL,
  \`wallet\` VARCHAR(42) NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`user_UNIQUE\` (\`user_uuid\` ASC)
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`authUser\`;
  `);
}

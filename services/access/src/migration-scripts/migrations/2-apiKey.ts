export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`apiKey\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`apiKey\` VARCHAR(36) NOT NULL,
  \`apiKeySecret\` VARCHAR(300) NULL,
  \`project_uuid\` VARCHAR(36) NOT NULL,
  \`name\` VARCHAR(255) NULL,
  \`status\` INT NULL,
  \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  \`createUser\` INT NULL,
  \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`updateUser\` INT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`key_UNIQUE\` (\`apiKey\` ASC));
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`apiKey\`;
  `);
}

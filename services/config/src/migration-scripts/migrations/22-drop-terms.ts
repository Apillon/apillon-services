export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`terms\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`terms\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`status\` INT NOT NULL,
    \`title\` VARCHAR(300) NOT NULL,
    \`type\` INT NOT NULL,
    \`text\` TEXT NULL,
    \`url\` VARCHAR(300) NULL,
    \`validFrom\` DATETIME NOT NULL,
    \`isRequired\` INT(1) NULL,
    \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` VARCHAR(36) NULL,
    \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` VARCHAR(36) NULL,
    PRIMARY KEY (\`id\`));
  `);
}

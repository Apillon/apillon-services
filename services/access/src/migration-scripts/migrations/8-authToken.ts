export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
   CREATE TABLE IF NOT EXISTS \`authToken\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`tokenHash\` VARCHAR(300) NOT NULL,
    \`user_uuid\` VARCHAR(36) NOT NULL,
    \`tokenType\` VARCHAR(30) NOT NULL,
    \`expiresIn\` VARCHAR(5) NOT NULL DEFAULT '1d',
    \`status\` INT NULL,
    \`createTime\` DATETIME NULL,
    \`createUser\` INT NULL,
    \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` INT NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`authToken_uuid_idx\` (\`user_uuid\` ASC),
    INDEX \`authToken_tokenType_idx\` (\`tokenType\` ASC)
  );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`authToken\`;
  `);
}

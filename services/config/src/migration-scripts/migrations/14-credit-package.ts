export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`creditPackage\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`status\` INT NULL,
      \`name\` VARCHAR(45) NULL,
      \`description\` VARCHAR(3000) NULL,
      \`creditAmount\` INT NOT NULL,
      \`bonusCredits\` INT NOT NULL,
      \`stripeId\` VARCHAR(60) NOT NULL,
      \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      \`createUser\` VARCHAR(36) NULL,
      \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`updateUser\` VARCHAR(36) NULL,
      PRIMARY KEY (\`id\`));

  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`creditPackage\`;
  `);
}

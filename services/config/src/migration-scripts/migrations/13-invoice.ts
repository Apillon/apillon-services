export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`invoice\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`project_uuid\` VARCHAR(36) NOT NULL,
    \`status\` INT NULL,
    \`subtotalAmount\` DECIMAL(12,2) NOT NULL,
    \`totalAmount\` DECIMAL(12,2) NOT NULL,
    \`referenceTable\` VARCHAR(36) NULL,
    \`referenceId\` VARCHAR(36) NULL,
    \`clientEmail\` VARCHAR(60) NOT NULL,
    \`clientName\` VARCHAR(60) NOT NULL,
    \`currency\` VARCHAR(10) NULL,
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
    DROP TABLE IF EXISTS \`invoice\`;
  `);
}

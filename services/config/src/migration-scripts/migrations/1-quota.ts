export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
  CREATE TABLE IF NOT EXISTS \`quota\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`status\` INT NULL,
    \`groupName\` VARCHAR(45) NULL,
    \`name\` VARCHAR(45) NULL,
    \`description\` VARCHAR(3000) NULL,
    \`valueType\` INT NULL COMMENT '1- MAX\n2- MIN\n3 - boolean',
    \`value\` INT NULL,
    \`service_type_id\` INT NULL,
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
    DROP TABLE IF EXISTS \`quota\`;
  `);
}

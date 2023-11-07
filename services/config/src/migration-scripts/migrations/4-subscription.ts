export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`subscription\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`package_id\` INT NULL,
    \`project_uuid\` VARCHAR(36) NULL,
    \`status\` INT NULL,
    \`expiresOn\` DATETIME NULL,
    \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` VARCHAR(36) NULL,
    \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` VARCHAR(36) NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`fk_subscription_subscriptionPackage1_idx\` (\`package_id\` ASC) VISIBLE,
    CONSTRAINT \`fk_subscription_subscriptionPackage1\`
      FOREIGN KEY (\`package_id\`)
      REFERENCES \`subscriptionPackage\` (\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`subscription\`;
  `);
}

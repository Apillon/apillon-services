export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
   CREATE TABLE IF NOT EXISTS \`templateValue\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`quotaTemplates_id\` INT NOT NULL,
    \`quota_id\` INT NOT NULL,
    \`status\` INT NULL,
    \`description\` VARCHAR(3000) NULL,
    \`limit\` INT NULL,
    \`createTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    \`createUser\` VARCHAR(36) NULL,
    \`updateTime\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`updateUser\` VARCHAR(36) NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`fk_quota_overrides_quota_idx\` (\`quota_id\` ASC) VISIBLE,
    INDEX \`fk_overrides_copy1_quotaTemplates1_idx\` (\`quotaTemplates_id\` ASC) VISIBLE,
    CONSTRAINT \`fk_quota_overrides_quota0\`
      FOREIGN KEY (\`quota_id\`)
      REFERENCES \`quota\` (\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION,
    CONSTRAINT \`fk_overrides_copy1_quotaTemplates1\`
      FOREIGN KEY (\`quotaTemplates_id\`)
      REFERENCES \`quotaTemplate\` (\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`templateValue\`;
  `);
}

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`instruction\` DROP COLUMN instructionEnum;
    `);

  await queryFn(`
    ALTER TABLE \`instruction\`
    ADD COLUMN \`expanded\` BOOLEAN DEFAULT 1;
    `);

  await queryFn(`
    ALTER TABLE \`instruction\`
    ADD COLUMN \`sortId\` INT NULL;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`instruction\`
    ADD COLUMN \`instructionEnum\` VARCHAR(100) NULL;
    `);

  await queryFn(`
        ALTER TABLE \`instruction\` DROP COLUMN expanded;
    `);

  await queryFn(`
        ALTER TABLE \`instruction\` DROP COLUMN sortId;
    `);
}

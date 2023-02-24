import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.INSTRUCTION}\` DROP COLUMN instructionEnum;
    `);

  await queryFn(`
    ALTER TABLE \`${DbTables.INSTRUCTION}\`
    ADD COLUMN \`expanded\` BOOLEAN DEFAULT 1;
    `);

  await queryFn(`
    ALTER TABLE \`${DbTables.INSTRUCTION}\`
    ADD COLUMN \`sortId\` INT NULL;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.INSTRUCTION}\`
    ADD COLUMN \`instructionEnum\` VARCHAR(100) NULL;
    `);

  await queryFn(`
        ALTER TABLE \`${DbTables.INSTRUCTION}\` DROP COLUMN expanded;
    `);

  await queryFn(`
        ALTER TABLE \`${DbTables.INSTRUCTION}\` DROP COLUMN sortId;
    `);
}

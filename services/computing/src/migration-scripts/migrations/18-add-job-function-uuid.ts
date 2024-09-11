import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.ACURAST_JOB}\`
    ADD COLUMN \`function_uuid\` VARCHAR(36) NOT NULL AFTER \`project_uuid\`,
    DROP COLUMN \`description\`,
    DROP COLUMN \`startTime\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.ACURAST_JOB}\`
    DROP COLUMN \`function_uuid\`,
    ADD COLUMN \`description\` VARCHAR(255) NULL,
    ADD COLUMN \`startTime\` DATETIME NULL;
  `);
}

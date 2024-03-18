import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.CREDIT}\`
    ADD COLUMN \`threshold\` INT NOT NULL DEFAULT 200,
    ADD COLUMN \`lastAlertTime\` DATETIME NULL 
    ;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.CREDIT}\` 
        DROP COLUMN \`threshold\`, 
        DROP COLUMN \`lastAlertTime\`;
    `);
}

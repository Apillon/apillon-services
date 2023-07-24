import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WALLET}\`
    ADD COLUMN \`currentBalance\` DECIMAL(40,0) NULL AFTER \`minBalance\`,
    ADD COLUMN \`decimals\` INT(3) NULL AFTER \`currentBalance\`,
    ADD COLUMN \`token\` VARCHAR(10) NULL AFTER \`decimals\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WALLET}\` 
    DROP COLUMN \`currentBalance\`,
    DROP COLUMN \`decimals\`,
    DROP COLUMN \`token\`;
  `);
}

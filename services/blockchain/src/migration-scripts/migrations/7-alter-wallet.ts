import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WALLET}\` 
    ADD COLUMN \`minBalance\` DECIMAL(40,0) NULL AFTER \`type\`; 
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WALLET}\` 
    DROP COLUMN \`minBalance\`; 
  `);
}

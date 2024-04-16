import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.CONTRACT_VERSION}\`
      MODIFY bytecode TEXT DEFAULT NULL;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  // we need to set default value before downgrade else migration fails
  await queryFn(`
    UPDATE \`${DbTables.CONTRACT_VERSION}\`
    SET bytecode = ''
    WHERE bytecode IS NULL;
  `);
  await queryFn(`
    ALTER TABLE \`${DbTables.CONTRACT_VERSION}\`
      MODIFY bytecode TEXT NOT NULL;
  `);
}

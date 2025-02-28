import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE ${DbTables.AUTH_USER} ADD COLUMN googleId VARCHAR(50) NULL AFTER \`evmWallet\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE ${DbTables.AUTH_USER} DROP COLUMN googleId;
  `);
}

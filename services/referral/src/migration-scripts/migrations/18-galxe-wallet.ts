import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    CREATE TABLE IF NOT EXISTS \`${DbTables.GALXE_WALLET}\` (
      \`wallet\` VARCHAR(42) NOT NULL,
      \`count\` INT NOT NULL
    )
  `);

  await queryFn(`
    CREATE INDEX idx_wallet ON ${DbTables.GALXE_WALLET} (wallet);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DROP TABLE IF EXISTS \`${DbTables.GALXE_WALLET}\`;
  `);
}

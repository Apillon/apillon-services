import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.AUTH_USER}\`
    ADD UNIQUE INDEX \`idx_wallet\` (wallet);
  `);

  await queryFn(`
    ALTER TABLE \`${DbTables.AUTH_USER}\`
    ADD UNIQUE INDEX \`idx_evm_wallet\` (evmWallet);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`DROP INDEX \`idx_wallet\` ON \`${DbTables.AUTH_USER}\``);
  await queryFn(`DROP INDEX \`idx_evm_wallet\` ON \`${DbTables.AUTH_USER}\``);
}

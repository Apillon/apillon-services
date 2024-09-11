import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_QUEUE}\`
      ADD CONSTRAINT chain_chainType_address_nonce_status UNIQUE (chain, chainType, address, nonce, status);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.TRANSACTION_QUEUE}\`
        DROP INDEX chain_chainType_address_nonce_status;
  `);
}

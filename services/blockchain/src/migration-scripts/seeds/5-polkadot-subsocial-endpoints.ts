import { ChainType, SubstrateChain } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  // Note: Polkadot RPC URL is modified to a private one in the database
  await queryFn(`
        INSERT INTO ${DbTables.ENDPOINT} (status, url, chain, chainType)
        VALUES
          (5, 'wss://rpc.polkadot.io', ${SubstrateChain.POLKADOT}, ${ChainType.SUBSTRATE}),
          (5, 'wss://para.f3joule.space', ${SubstrateChain.SUBSOCIAL}, ${ChainType.SUBSTRATE})
        ;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        DELETE
        FROM \`${DbTables.ENDPOINT}\`
        WHERE chain IN (${SubstrateChain.POLKADOT}, ${SubstrateChain.SUBSOCIAL});
    `);
}

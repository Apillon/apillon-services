import { ChainType, EvmChain } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.ENDPOINT} (status, url, chain, chainType)
    VALUES (5, 'https://mainnet.base.org	', ${EvmChain.BASE},
            ${ChainType.EVM}),
           (5, 'https://sepolia.base.org	', ${EvmChain.BASE_SEPOLIA},
            ${ChainType.EVM});
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.ENDPOINT}\`
    WHERE chain IN (${EvmChain.BASE}, ${EvmChain.BASE_SEPOLIA});
  `);
}

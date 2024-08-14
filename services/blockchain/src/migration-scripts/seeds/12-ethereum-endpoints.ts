import { ChainType, EvmChain, SubstrateChain } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.ENDPOINT} (status, url, chain, chainType)
    VALUES (5, 'https://ethereum-rpc.publicnode.com', ${EvmChain.ETHEREUM},
            ${ChainType.EVM}),
           (5, 'https://ethereum-sepolia-rpc.publicnode.com',
            ${EvmChain.SEPOLIA},
            ${ChainType.EVM})
    ;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.ENDPOINT}\`
    WHERE chain IN (${EvmChain.ETHEREUM}, ${EvmChain.SEPOLIA});
  `);
}

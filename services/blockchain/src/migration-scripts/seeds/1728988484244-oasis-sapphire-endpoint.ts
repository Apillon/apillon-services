import { EvmChain, ChainType } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO ${DbTables.ENDPOINT} (status, url, chain, chainType)
    VALUES (5, 'https://1rpc.io/oasis/sapphire	', ${EvmChain.OASIS_SAPPHIRE}, ${ChainType.EVM})
    ;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM \`${DbTables.ENDPOINT}\` WHERE chain = ${EvmChain.OASIS_SAPPHIRE};
  `);
}

import { QuotaCode } from '@apillon/lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO quota (id, status, groupName, name, description, valueType, value)
    VALUES
    (${QuotaCode.MAX_ETHEREUM_NFT_COLLECTIONS}, 5, 'Ethereum NFTs', 'Ethereum NFT collections limit', 'Max number of Ethereum NFT collections per project', 1, 0)
;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM quota
    WHERE id = ${QuotaCode.MAX_ETHEREUM_NFT_COLLECTIONS};
  `);
}

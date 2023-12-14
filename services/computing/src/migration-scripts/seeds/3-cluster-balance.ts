import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO \`${DbTables.CLUSTER_WALLET}\` (\`id\`,
                                                \`clusterId\`,
                                                \`walletAddress\`,
                                                \`minBalance\`,
                                                \`currentBalance\`,
                                                \`decimals\`,
                                                \`token\`)
    VALUES (
            1,
            '0x0000000000000000000000000000000000000000000000000000000000000001',
            200000000000,
            0,
            12,
            'PHA'
            );
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.CLUSTER_WALLET}\`
    WHERE id = 1;
  `);
}

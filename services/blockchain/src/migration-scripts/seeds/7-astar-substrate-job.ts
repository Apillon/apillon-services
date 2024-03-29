import { SubstrateChain } from '@apillon/lib';
import { DbTables } from '@apillon/workers-lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO \`${DbTables.JOB}\` (\`name\`,
                                     \`channel\`,
                                     \`interval\`,
                                     \`nextRun\`,
                                     \`input\`,
                                     \`parameters\`,
                                     \`status\`,
                                     \`timeout\`)
    VALUES ('TransmitAstarSubstrateTransactions', 0, '*/2 * * * *',
            '2023-01-25 10:00:00',
            '{"chain": ${SubstrateChain.PHALA}}',
            '{"chain": ${SubstrateChain.PHALA}, "channel": 0}', 5, 900),
           ('VerifyAstarSubstrateTransactions', 0, '*/1 * * * *',
            '2023-01-25 10:00:00',
            '{"chainId": ${SubstrateChain.PHALA}}',
            '{"chainId": ${SubstrateChain.PHALA}, "channel": 0}', 5, 900);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.JOB}\`
    WHERE name IN ('TransmitAstarSubstrateTransactions',
                   'VerifyAstarSubstrateTransactions');
  `);
}

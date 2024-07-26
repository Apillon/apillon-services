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
    VALUES ('TransmitAcurastTransactions', 0, '*/2 * * * *',
            '2023-01-25 10:00:00',
            '{"chain": ${SubstrateChain.ACURAST}}',
            '{"chain": ${SubstrateChain.ACURAST}, "channel": 0}', 3, 900),
           ('VerifyAcurastTransactions', 0, '*/1 * * * *',
            '2023-01-25 10:00:00',
            '{"chainId": ${SubstrateChain.ACURAST}}',
            '{"chainId": ${SubstrateChain.ACURAST}, "channel": 0}', 3, 900);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.JOB}\`
    WHERE name IN ('TransmitAcurastTransactions', 'VerifyAcurastTransactions');
  `);
}

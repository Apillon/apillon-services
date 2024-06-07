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
    VALUES ('ClaimContractEventsWorker', 0, '*/1 * * * *',
            NOW(),
            '{"contractId": 2}',
            '{"contractId": 2, "channel": 0}', 9, 900)
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.JOB}\`
    WHERE name = 'ClaimContractEventsWorker';
  `);
}

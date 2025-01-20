import { EvmChain } from '@apillon/lib';
import { DbTables } from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';

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
    VALUES ('${WorkerName.TRANSMIT_BASE_TRANSACTIONS}', 0, '*/2 * * * *',
            '2024-12-23 10:00:00',
            '{"chain": ${EvmChain.BASE}}',
            '{"chain": ${EvmChain.BASE}, "channel": 0}', 9, 900),
           ('${WorkerName.TRANSMIT_BASE_SEPOLIA_TRANSACTIONS}', 0,
            '*/2 * * * *',
            '2024-12-23 10:00:00',
            '{"chain": ${EvmChain.BASE_SEPOLIA}}',
            '{"chain": ${EvmChain.BASE_SEPOLIA}, "channel": 0}', 9, 900),
           ('${WorkerName.VERIFY_BASE_TRANSACTIONS}', 0, '*/1 * * * *',
            '2024-12-23 10:00:00',
            '{"chain": ${EvmChain.BASE}}',
            '{"chain": ${EvmChain.BASE}, "channel": 0}', 9, 900),
           ('${WorkerName.VERIFY_BASE_SEPOLIA_TRANSACTIONS}', 0, '*/1 * * * *',
            '2024-12-23 10:00:00',
            '{"chain": ${EvmChain.BASE_SEPOLIA}}',
            '{"chain": ${EvmChain.BASE_SEPOLIA}, "channel": 0}', 9, 900);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.JOB}\`
    WHERE name IN (
                    '${WorkerName.TRANSMIT_BASE_TRANSACTIONS}',
                    '${WorkerName.TRANSMIT_BASE_SEPOLIA_TRANSACTIONS}',
                    '${WorkerName.VERIFY_BASE_TRANSACTIONS}',
                    '${WorkerName.VERIFY_BASE_SEPOLIA_TRANSACTIONS}'
      );
  `);
}

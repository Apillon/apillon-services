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
    VALUES ('${WorkerName.TRANSMIT_ETHEREUM_TRANSACTIONS}', 0, '*/2 * * * *',
            '2023-05-25 10:00:00',
            '{"chain": ${EvmChain.ETHEREUM}}',
            '{"chain": ${EvmChain.ETHEREUM}, "channel": 0}', 5, 900),
           ('${WorkerName.TRANSMIT_SEPOLIA_TRANSACTIONS}', 0, '*/2 * * * *',
            '2023-05-25 10:00:00',
            '{"chain": ${EvmChain.SEPOLIA}}',
            '{"chain": ${EvmChain.SEPOLIA}, "channel": 0}', 5, 900),
           ('${WorkerName.VERIFY_ETHEREUM_TRANSACTIONS}', 0, '*/1 * * * *',
            '2023-05-25 10:00:00',
            '{"chain": ${EvmChain.ETHEREUM}}',
            '{"chain": ${EvmChain.ETHEREUM}, "channel": 0}', 5, 900),
           ('${WorkerName.VERIFY_SEPOLIA_TRANSACTIONS}', 0, '*/1 * * * *',
            '2023-05-25 10:00:00',
            '{"chain": ${EvmChain.SEPOLIA}}',
            '{"chain": ${EvmChain.SEPOLIA}, "channel": 0}', 5, 900);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.JOB}\`
    WHERE name IN (
                    '${WorkerName.TRANSMIT_ETHEREUM_TRANSACTIONS}',
                    '${WorkerName.TRANSMIT_SEPOLIA_TRANSACTIONS}',
                    '${WorkerName.VERIFY_ETHEREUM_TRANSACTIONS}',
                    '${WorkerName.VERIFY_SEPOLIA_TRANSACTIONS}'
      );
  `);
}

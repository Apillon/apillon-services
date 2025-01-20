import { EvmChain } from '@apillon/lib';
import { DbTables } from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';

const chains = [
  EvmChain.ARBITRUM_ONE,
  EvmChain.ARBITRUM_ONE_SEPOLIA,
  EvmChain.AVALANCHE,
  EvmChain.AVALANCHE_FUJI,
  EvmChain.OPTIMISM,
  EvmChain.OPTIMISM_SEPOLIA,
  EvmChain.POLYGON,
  EvmChain.POLYGON_AMOY,
];

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const values = chains
    .map(
      (chain) => `
        ('${WorkerName.TRANSMIT_BASE_TRANSACTIONS}', 0, '*/2 * * * *',
         '2024-12-23 10:00:00',
         '{"chain": ${chain}}',
         '{"chain": ${chain}, "channel": 0}', 9, 900),
        ('${WorkerName.VERIFY_BASE_TRANSACTIONS}', 0, '*/1 * * * *',
         '2024-12-23 10:00:00',
         '{"chain": ${chain}}',
         '{"chain": ${chain}, "channel": 0}', 9, 900)`,
    )
    .join(', ');
  await queryFn(`
    INSERT INTO \`${DbTables.JOB}\` (\`name\`,
                                     \`channel\`,
                                     \`interval\`,
                                     \`nextRun\`,
                                     \`input\`,
                                     \`parameters\`,
                                     \`status\`,
                                     \`timeout\`)
    VALUES ${values};
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const names = chains
    .map(
      () => `
        '${WorkerName.TRANSMIT_BASE_TRANSACTIONS}',
        '${WorkerName.VERIFY_BASE_TRANSACTIONS}'`,
    )
    .join(', ');
  await queryFn(`
    DELETE
    FROM \`${DbTables.JOB}\`
    WHERE name IN (${names});
  `);
}

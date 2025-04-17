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

const TRANSMIT_WORKERS = {
  [EvmChain.ARBITRUM_ONE]: WorkerName.TRANSMIT_ARBITRUM_ONE_TRANSACTIONS,
  [EvmChain.ARBITRUM_ONE_SEPOLIA]:
    WorkerName.TRANSMIT_ARBITRUM_ONE_SEPOLIA_TRANSACTIONS,
  [EvmChain.AVALANCHE]: WorkerName.TRANSMIT_AVALANCHE_TRANSACTIONS,
  [EvmChain.AVALANCHE_FUJI]: WorkerName.TRANSMIT_AVALANCHE_FUJI_TRANSACTIONS,
  [EvmChain.OPTIMISM]: WorkerName.TRANSMIT_OPTIMISM_TRANSACTIONS,
  [EvmChain.OPTIMISM_SEPOLIA]:
    WorkerName.TRANSMIT_OPTIMISM_SEPOLIA_TRANSACTIONS,
  [EvmChain.POLYGON]: WorkerName.TRANSMIT_POLYGON_TRANSACTIONS,
  [EvmChain.POLYGON_AMOY]: WorkerName.TRANSMIT_POLYGON_AMOY_TRANSACTIONS,
};
const VERIFY_WORKERS = {
  [EvmChain.ARBITRUM_ONE]: WorkerName.VERIFY_ARBITRUM_ONE_TRANSACTIONS,
  [EvmChain.ARBITRUM_ONE_SEPOLIA]:
    WorkerName.VERIFY_ARBITRUM_ONE_SEPOLIA_TRANSACTIONS,
  [EvmChain.AVALANCHE]: WorkerName.VERIFY_AVALANCHE_TRANSACTIONS,
  [EvmChain.AVALANCHE_FUJI]: WorkerName.VERIFY_AVALANCHE_FUJI_TRANSACTIONS,
  [EvmChain.OPTIMISM]: WorkerName.VERIFY_OPTIMISM_TRANSACTIONS,
  [EvmChain.OPTIMISM_SEPOLIA]: WorkerName.VERIFY_OPTIMISM_SEPOLIA_TRANSACTIONS,
  [EvmChain.POLYGON]: WorkerName.VERIFY_POLYGON_TRANSACTIONS,
  [EvmChain.POLYGON_AMOY]: WorkerName.VERIFY_POLYGON_AMOY_TRANSACTIONS,
};

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  const values = chains
    .map(
      (chain) => `
        ('${TRANSMIT_WORKERS[chain]}', 0, '*/2 * * * *',
         '2024-12-23 10:00:00',
         '{"chain": ${chain}}',
         '{"chain": ${chain}, "channel": 0}', 9, 900),
        ('${VERIFY_WORKERS[chain]}', 0, '*/1 * * * *',
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
      (chain) => `
        '${TRANSMIT_WORKERS[chain]}',
        '${VERIFY_WORKERS[chain]}'`,
    )
    .join(', ');
  await queryFn(`
    DELETE
    FROM \`${DbTables.JOB}\`
    WHERE name IN (${names});
  `);
}

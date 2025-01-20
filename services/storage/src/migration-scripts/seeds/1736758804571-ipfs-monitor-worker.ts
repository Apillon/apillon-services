import { WorkerName } from '../../workers/worker-executor';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    INSERT INTO \`job\` (\`status\`, \`name\`, \`interval\`, \`nextRun\`, \`timeout\`) 
    VALUES ('5', '${WorkerName.IPFS_MONITOR_WORKER}', '*/5 * * * *', NOW(), '3600'); `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `DELETE FROM job WHERE name = '${WorkerName.IPFS_MONITOR_WORKER}';`,
  );
}

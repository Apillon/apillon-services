import { SqlModelStatus } from '@apillon/lib';
import { WorkerName } from '../../workers/worker-executor';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    INSERT INTO job (status, name, \`interval\`, nextRun, timeout)
    VALUES (${SqlModelStatus.ACTIVE}, '${WorkerName.EXPIRED_RPC_SUBSCRIPTIONS_WORKER}', '0 12 * * *', NOW(), '3600');
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `DELETE FROM job where name = '${WorkerName.EXPIRED_RPC_SUBSCRIPTIONS_WORKER}'`,
  );
}

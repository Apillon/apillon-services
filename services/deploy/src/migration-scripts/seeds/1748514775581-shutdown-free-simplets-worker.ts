import { SqlModelStatus } from '@apillon/lib';
import { DbTables } from '../../config/types';
import { WorkerName } from '../../workers/worker-executor';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    INSERT INTO \`${DbTables.JOB}\`
    (\`name\`, \`channel\`, \`interval\`, \`nextRun\`, \`status\`, \`timeout\`)
    VALUES ('${WorkerName.SHUTDOWN_FREE_SIMPLETS_WORKER}', 0, '0 1 * * *', NOW(), ${SqlModelStatus.ACTIVE}, 3600);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    DELETE
    FROM \`${DbTables.JOB}\`
    WHERE name = '${WorkerName.SHUTDOWN_FREE_SIMPLETS_WORKER}';
  `);
}

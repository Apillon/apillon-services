import { DbTables } from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`INSERT INTO \`${DbTables.JOB}\` (
      \`name\`,
      \`channel\`,
      \`interval\`,
      \`nextRun\`,
      \`status\`,
      \`timeout\`
      )
      VALUES
      ('${WorkerName.RPC_USAGE_CHECK}', 0, '0 0 * * *', NOW(), 5, 900)`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `DELETE FROM \`${DbTables.JOB}\` WHERE \`name\` = '${WorkerName.RPC_USAGE_CHECK}'`,
  );
}

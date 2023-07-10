import { DbTables } from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO \`${DbTables.JOB}\` (
      \`name\`,
      \`channel\`,
      \`interval\`,
      \`nextRun\`,
      \`status\`,
      \`timeout\`,
      \`parameters\`
      )
      VALUES
      ('${WorkerName.TRANSACTION_LOG}', 0, '*/5 * * * *', '2023-01-25 10:00:00', 5, 900, '{"batchLimit": 500}');
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM \`${DbTables.JOB}\` 
    WHERE name = '${WorkerName.TRANSACTION_LOG}'
  `);
}

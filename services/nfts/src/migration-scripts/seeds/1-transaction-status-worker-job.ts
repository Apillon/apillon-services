import { DbTables } from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `INSERT INTO \`${DbTables.JOB}\` (\`status\`,\`name\`, \`interval\`, \`nextRun\`, \`timeout\`)
    VALUES (5, '${WorkerName.TRANSACTION_STATUS}', '0/3 * * * *', NOW(), 86400);`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DELETE FROM \`${DbTables.JOB}\`
    WHERE name = '${WorkerName.TRANSACTION_STATUS}';
  `);
}

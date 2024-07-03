import { DbTables } from '@apillon/workers-lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO \`${DbTables.JOB}\` (\`name\`, \`channel\`, \`interval\`, \`nextRun\`, \`status\`, \`timeout\`)
    VALUES ('AcurastJobStatusWorker', 0, '*/2 * * * *', '2024-01-01 10:00:00', 9, 900);
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.JOB}\`
    WHERE name = 'AcurastJobStatusWorker';
  `);
}

import { SqlModelStatus } from '@apillon/lib';
import { DbTables } from '@apillon/workers-lib';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `UPDATE ${DbTables.JOB}
     SET status = ${SqlModelStatus.INACTIVE}
     WHERE name = "PhalaLogWorker";`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `UPDATE ${DbTables.JOB}
     SET status = ${SqlModelStatus.ACTIVE}
     WHERE name = "PhalaLogWorker";`,
  );
}

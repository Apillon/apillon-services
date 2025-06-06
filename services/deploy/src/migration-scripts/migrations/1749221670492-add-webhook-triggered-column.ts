import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE ${DbTables.BACKEND}
      ADD COLUMN \`webhookTriggered\` DATETIME NULL AFTER \`data\`;`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE ${DbTables.BACKEND}
      DROP COLUMN \`webhookTriggered\`;`,
  );
}

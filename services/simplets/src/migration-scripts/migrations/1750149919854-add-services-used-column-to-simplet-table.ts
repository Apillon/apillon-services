import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE ${DbTables.SIMPLET}
      ADD COLUMN \`servicesUsed\` JSON DEFAULT (CAST('[]' AS JSON)) AFTER \`description\`;`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE ${DbTables.SIMPLET}
      DROP COLUMN \`servicesUsed\`;`,
  );
}

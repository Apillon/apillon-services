import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE ${DbTables.SIMPLET_DEPLOY}
      ADD COLUMN \`trialExpired\` BOOLEAN DEFAULT FALSE NOT NULL AFTER \`description\`;`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE ${DbTables.SIMPLET_DEPLOY}
      DROP COLUMN \`trialExpired\`;`,
  );
}

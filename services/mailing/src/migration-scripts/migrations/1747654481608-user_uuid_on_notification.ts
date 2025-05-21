import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
  ALTER TABLE ${DbTables.NOTIFICATION}
  ADD COLUMN IF NOT EXISTS user_uuid VARCHAR(36) NULL;
`);

  await queryFn(`
  ALTER TABLE ${DbTables.NOTIFICATION}
  DROP COLUMN IF EXISTS user_id;
`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
  ALTER TABLE ${DbTables.NOTIFICATION}
  DROP COLUMN IF EXISTS user_uuid;
`);

  await queryFn(`
  ALTER TABLE ${DbTables.NOTIFICATION}
  ADD COLUMN IF NOT EXISTS user_id INT NULL;
`);
}

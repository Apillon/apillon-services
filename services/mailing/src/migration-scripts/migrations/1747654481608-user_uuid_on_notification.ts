import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
  ALTER TABLE ${DbTables.NOTIFICATION}
  ADD COLUMN user_uuid VARCHAR(36) NULL;
`);

  await queryFn(`
  ALTER TABLE ${DbTables.NOTIFICATION}
  DROP COLUMN userId;
`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
  ALTER TABLE ${DbTables.NOTIFICATION}
  DROP COLUMN user_uuid;
`);

  await queryFn(`
  ALTER TABLE ${DbTables.NOTIFICATION}
  ADD COLUMN userId INT NULL;
`);
}

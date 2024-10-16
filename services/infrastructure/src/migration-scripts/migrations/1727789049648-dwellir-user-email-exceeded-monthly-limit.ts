import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`DELETE FROM ${DbTables.DWELLIR_USER};`);
  await queryFn(
    `ALTER TABLE ${DbTables.DWELLIR_USER} ADD COLUMN exceeded_monthly_limit BOOLEAN NOT NULL AFTER dwellir_id ;`,
  );
  await queryFn(
    `ALTER TABLE ${DbTables.DWELLIR_USER} ADD COLUMN email VARCHAR(100) NOT NULL AFTER exceeded_monthly_limit;`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE ${DbTables.DWELLIR_USER} DROP COLUMN exceeded_monthly_limit;`,
  );
  await queryFn(`ALTER TABLE ${DbTables.DWELLIR_USER} DROP COLUMN email;`);
}

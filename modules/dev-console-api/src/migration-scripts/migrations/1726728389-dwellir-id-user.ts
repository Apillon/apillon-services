import { DbTables } from '../../config/types';

export const upgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(
    `ALTER TABLE ${DbTables.USER} ADD COLUMN  \`dwellir_id\` TEXT NULL;`,
  );
};

export const downgrade = async (
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> => {
  await queryFn(`ALTER TABLE ${DbTables.USER} DROP COLUMN \`dwellir_id\`;`);
};

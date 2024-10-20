import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE \`${DbTables.OASIS_SIGNATURE}\` DROP COLUMN apiKey;`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(
    `ALTER TABLE \`${DbTables.OASIS_SIGNATURE}\` ADD COLUMN apiKey varchar(255) NULL;`,
  );
}

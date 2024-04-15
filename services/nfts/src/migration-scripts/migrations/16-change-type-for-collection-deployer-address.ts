import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
      MODIFY COLUMN \`deployerAddress\` VARCHAR (50),
      MODIFY COLUMN \`royaltiesAddress\` VARCHAR (50);
  `);
}

export async function downgrade(
  _queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  // this was removed because it fails on downgrade id data in column is longer than 42 char
  // await queryFn(`
  //   ALTER TABLE \`${DbTables.COLLECTION}\`
  //     MODIFY COLUMN \`deployerAddress\` VARCHAR (42),
  //     MODIFY COLUMN \`royaltiesAddress\` VARCHAR (42);
  // `);
}

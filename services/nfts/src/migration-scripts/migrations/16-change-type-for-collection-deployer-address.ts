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
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
      MODIFY COLUMN \`deployerAddress\` VARCHAR (42),
      MODIFY COLUMN \`royaltiesAddress\` VARCHAR (42);
  `);
}

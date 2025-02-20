import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.OASIS_SIGNATURE}\`
    DROP COLUMN \`hashedUsername\`,
    ADD COLUMN \`contractAddress\` VARCHAR(50) NULL AFTER \`publicAddress\`;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.OASIS_SIGNATURE}\`
    ADD COLUMN \`hashedUsername\` VARCHAR(50) NOT NULL,
    DROP COLUMN \`contractAddress\`;
  `);
}

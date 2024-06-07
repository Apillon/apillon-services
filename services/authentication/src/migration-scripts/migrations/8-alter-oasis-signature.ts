import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.OASIS_SIGNATURE}\`
    ADD COLUMN \`hashedUsername\` VARCHAR(255) NULL AFTER \`dataHash\`,
    ADD COLUMN \`publicAddress\` VARCHAR(255) NULL AFTER \`hashedUsername\`,
    ADD COLUMN \`apiKey\` VARCHAR(255) NULL AFTER \`publicAddress\`
    ;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.OASIS_SIGNATURE}\`
    DROP COLUMN \`hashedUsername\`,
    DROP COLUMN \`publicAddress\`,
    DROP COLUMN \`apiKey\`
    ;
  `);
}

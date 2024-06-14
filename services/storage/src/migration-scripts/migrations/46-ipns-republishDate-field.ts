import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.IPNS}\`
    ADD COLUMN \`republishDate\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER \`status\`,
    ADD INDEX \`republish_idx\` (\`republishDate\` ASC) VISIBLE;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.IPNS}\` DROP COLUMN \`republishDate\`;
    `);
}

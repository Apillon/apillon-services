import { WebsiteSource } from '@apillon/lib';
import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.WEBSITE}\` ADD COLUMN \`source\` INT NOT NULL DEFAULT ${WebsiteSource.APILLON};
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<void>,
) {
  await queryFn(`
    ALTER TABLE \`${DbTables.WEBSITE}\` DROP COLUMN \`source\`;`);
}

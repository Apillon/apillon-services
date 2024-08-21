import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.WEBSITE}\`
    ADD COLUMN \`domainLastResolveDate\` DATETIME NULL AFTER \`domainChangeDate\`,
    ADD COLUMN \`domainStatus\` INT NOT NULL DEFAULT 1 AFTER \`domainLastResolveDate\`,
    ADD INDEX \`resolveDate_idx\` (\`domainLastResolveDate\` ASC) VISIBLE;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.WEBSITE}\` 
        DROP INDEX \`resolveDate_idx\`,
        DROP COLUMN \`domainStatus\`,
        DROP COLUMN \`domainLastResolveDate\`;
    `);
}

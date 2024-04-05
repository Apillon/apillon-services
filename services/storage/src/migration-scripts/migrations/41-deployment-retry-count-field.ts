import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.DEPLOYMENT}\`
    ADD COLUMN \`retryCount\` TINYINT NOT NULL DEFAULT 0 AFTER \`deploymentStatus\`;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.DEPLOYMENT}\` 
        DROP COLUMN \`retryCount\`;
    `);
}

import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.DEPLOYMENT}\`
    ADD COLUMN \`directDeploy\` BOOLEAN NULL,
    ADD COLUMN \`clearBucketForUpload\` BOOLEAN NULL;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.DEPLOYMENT}\` 
        DROP COLUMN \`clearBucketForUpload\`, 
        DROP COLUMN \`directDeploy\`;
    `);
}

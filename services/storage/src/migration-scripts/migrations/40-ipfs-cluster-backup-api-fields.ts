import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.IPFS_CLUSTER}\`
    ADD COLUMN \`backupClusterServer\` VARCHAR(1000) NULL,
    ADD COLUMN \`backupIpfsApi\` VARCHAR(1000) NULL;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.IPFS_CLUSTER}\` 
        DROP COLUMN \`backupClusterServer\`,
        DROP COLUMN \`backupIpfsApi\`;
    `);
}

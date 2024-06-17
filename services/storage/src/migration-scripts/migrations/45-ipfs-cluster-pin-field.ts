import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.IPFS_CLUSTER}\`
    ADD COLUMN \`pinOnAdd\` BOOLEAN DEFAULT 1 AFTER loadBalancerIp;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.IPFS_CLUSTER}\` DROP COLUMN \`pinOnAdd\`;
    `);
}

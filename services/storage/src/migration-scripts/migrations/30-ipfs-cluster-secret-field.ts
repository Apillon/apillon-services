import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.IPFS_CLUSTER}\`
    ADD COLUMN \`secret\` VARCHAR(255) NULL AFTER \`private\`;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.IPFS_CLUSTER}\` DROP COLUMN \`secret\`;
    `);
}

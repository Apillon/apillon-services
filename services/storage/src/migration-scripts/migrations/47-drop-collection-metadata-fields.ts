import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.COLLECTION_METADATA}\` 
        DROP COLUMN useApillonIpfsGateway,
        DROP COLUMN ipnsId;
    `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION_METADATA}\`
    ADD COLUMN \`useApillonIpfsGateway\` BOOLEAN DEFAULT 1,
    ADD COLUMN \`ipnsId\` INT NULL;
    `);
}

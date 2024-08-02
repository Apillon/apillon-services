import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\`
      ADD COLUMN useApillonIpfsGateway BOOLEAN DEFAULT 0,
      ADD COLUMN useIpns BOOLEAN DEFAULT 0,
      ADD COLUMN ipns_uuid VARCHAR(36) NULL,
      ADD COLUMN cid VARCHAR(255) NULL;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.COLLECTION}\` 
    DROP COLUMN useIpns,
    DROP COLUMN ipns_uuid,
    DROP COLUMN cid,
    DROP COLUMN useApillonIpfsGateway;
  `);
}

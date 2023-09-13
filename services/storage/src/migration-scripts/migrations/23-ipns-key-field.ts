import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    ALTER TABLE \`${DbTables.IPNS}\`
    ADD COLUMN \`key\` VARCHAR(255) NULL;
    `);

  await queryFn(`
      UPDATE \`${DbTables.IPNS}\` 
      SET \`key\` = CONCAT(ipns.project_uuid, '_', ipns.bucket_id, '_', ipns.id);
    `);

  await queryFn(`
    INSERT INTO ipns (\`project_uuid\`, \`bucket_id\`, \`name\`, \`ipnsName\`, \`ipnsValue\`, \`cid\`, \`status\`, \`key\`)
    SELECT b.project_uuid, b.id, CONCAT(b.name, " IPNS"), b.IPNS, CONCAT("/ipfs/", b.CID) , b.CID, 5, b.bucket_uuid
    FROM bucket b
    where b.bucketType = 2 AND b.IPNS IS NOT NULL;
  `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
        ALTER TABLE \`${DbTables.IPNS}\` DROP COLUMN \`key\`;
    `);
}

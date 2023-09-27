import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO \`${DbTables.IPFS_CLUSTER}\` (\`status\`, \`clusterServer\`, \`ipfsApi\`, \`ipfsGateway\`, \`private\`, \`region\`, \`cloudProvider\`, \`performanceLevel\`, \`isDefault\`) 
    VALUES ('5', 'http://3.249.187.48:9094/', 'http://54.228.71.63:5001/api/v0', 'https://ipfs-dev.apillon.io/ipfs/', 0, 'EU', 'AWS', 1, 1); `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM \`${DbTables.IPFS_CLUSTER}\` WHERE clusterServer = 'http://3.249.187.48:9094/';
  `);
}

import { DbTables } from '../../config/types';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    INSERT INTO \`${DbTables.IPFS_CLUSTER}\` (\`status\`, \`clusterServer\`, \`ipfsApi\`, \`ipfsGateway\`, \`ipnsGateway\`, \`subdomainGateway\`, \`domain\`, \`private\`, \`secret\`, \`region\`, \`cloudProvider\`, \`performanceLevel\`, \`isDefault\`) 
    VALUES ('5', 'http://ipfs-eu1-0.apillon.io:9094/', 'http://ipfs-eu1-0.apillon.io:5001/api/v0', 'https://ipfs-eu1.apillon.io/ipfs/', 'https://ipfs-eu1.apillon.io/ipns/', '', 'ipfs-eu1.apillon.io', 1,'${process.env.DEFAULT_IPFS_CLUSTER_SECRET}', 'EU', 'GCP', 1, 1); `);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`
    DELETE FROM \`${DbTables.IPFS_CLUSTER}\` WHERE clusterServer = 'http://ipfs-eu1-0.apillon.io:9094/';
  `);
}

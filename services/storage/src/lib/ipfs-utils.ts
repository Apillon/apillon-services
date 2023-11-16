import { JwtTokenType, generateJwtToken } from '@apillon/lib';
import * as crypto from 'crypto';
import { IpfsCluster } from '../modules/ipfs/models/ipfs-cluster.model';

/**
 * Adds token query parameter to the url. Token is JWT (with url and project in body)
 * @param url url with token
 * @param cid CID or IPNS
 * @param project_uuid
 * @returns
 */
export function addJwtToIPFSUrl(
  url: string,
  project_uuid: string,
  cid: string,
  ipfsCluster: IpfsCluster,
) {
  if (!cid || !project_uuid || !ipfsCluster) {
    return url;
  }

  const jwt = generateJwtToken(
    JwtTokenType.IPFS_TOKEN,
    {
      cid,
      project_uuid,
    },
    'never',
    generateJwtSecret(project_uuid, ipfsCluster.secret),
  );

  return `${url}?token=${jwt}`;
}

export function generateJwtSecret(project_uuid, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(project_uuid)
    .digest('base64');
}

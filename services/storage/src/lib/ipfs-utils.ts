import { JwtTokenType, generateJwtToken } from '@apillon/lib';

/**
 * Adds token query parameter to the url. Token is JWT (with url and project in body)
 * @param url ipfs url
 * @param project_uuid
 * @returns
 */
export function addJwtToIPFSUrl(url: string, project_uuid: string) {
  if (!url || !project_uuid) {
    return url;
  }

  const jwt = generateJwtToken(
    JwtTokenType.IPFS_TOKEN,
    {
      url: url.replace('http://', '').replace('https://', ''),
      project_uuid,
    },
    'never',
  );

  return `${url}?token=${jwt}`;
}

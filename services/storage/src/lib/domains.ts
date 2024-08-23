import { env } from '@apillon/lib';
import dns from 'node:dns';

/**
 * Resolve domain dns and check if it is pointing to Apillon IPs
 * @param domain
 * @returns true if it points to valid Apillon IP (Ipfs node IP)
 */
export async function checkDomainDns(domain: string): Promise<boolean> {
  const validIps = env.VALID_WEBSITE_DOMAIN_TARGETS || [];

  if (!validIps.length) {
    console.log('[WARNING] NO VALID DOMAIN TARGETS IS SET!');
    return true;
  }

  const { address } = await dns.promises.lookup(domain).catch((err) => {
    console.error(`Error resolving DNS domain: ${err}`);
    return { address: null };
  });

  return validIps.includes(address);
}

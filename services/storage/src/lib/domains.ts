import { env } from '@apillon/lib';
import dns from 'node:dns';

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

  if (validIps.includes(address)) {
    return true;
  }
  return false;
}

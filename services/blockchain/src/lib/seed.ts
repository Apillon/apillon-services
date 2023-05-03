import { env, getSecrets } from '@apillon/lib';

export async function getWalletSeed(seed: string) {
  if (env.APP_ENV == 'test') {
    return seed;
  }
  const secrets = await getSecrets(env.BLOCKCHAIN_SECRETS);
  return secrets[seed];
}

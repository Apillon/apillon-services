import { AppEnvironment, env, getSecrets } from '@apillon/lib';

export async function getWalletSeed(seed: string) {
  if (
    env.APP_ENV == AppEnvironment.TEST ||
    env.APP_ENV == AppEnvironment.LOCAL_DEV
  ) {
    return seed;
  }
  const secrets = await getSecrets(env.BLOCKCHAIN_SECRETS);
  return secrets[seed];
}

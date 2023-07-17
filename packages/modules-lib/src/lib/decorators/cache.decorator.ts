import { env } from '@apillon/lib';
import { SetMetadata } from '@nestjs/common';

export interface ICacheOptions {
  enabled?: boolean;
  byUser?: boolean;
  byProject?: boolean;
  keyPrefix?: string;
  ttl?: number;
}
export const CACHE_OPTIONS = 'cache_options';

export const Cache = (options?: ICacheOptions) => {
  const defaultOptions: ICacheOptions = {
    enabled: true,
    byUser: true,
    byProject: false,
    keyPrefix: '',
    ttl: env.DEFAULT_CACHE_TTL,
  };

  const cacheOptions = { ...defaultOptions, ...options };
  return SetMetadata(CACHE_OPTIONS, cacheOptions);
};

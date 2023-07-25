import { CacheKeyTTL, env } from '@apillon/lib';
import { SetMetadata } from '@nestjs/common';

export interface ICacheOptions {
  enabled?: boolean;
  byUser?: boolean;
  byProject?: boolean;
  keyPrefix?: string;
  ttl?: CacheKeyTTL;
}
export const CACHE_OPTIONS = 'cache_options';
const defaultOptions: ICacheOptions = {
  enabled: true,
  byUser: false,
  byProject: false,
  keyPrefix: '',
  ttl: env.DEFAULT_CACHE_TTL,
};

export const Cache = (options?: ICacheOptions) => {
  const cacheOptions = { ...defaultOptions, ...options };
  return SetMetadata(CACHE_OPTIONS, cacheOptions);
};

export const CacheByUser = (options?: ICacheOptions) => {
  const cacheOptions: ICacheOptions = {
    ...defaultOptions,
    ...options,
    byUser: true,
  };
  return SetMetadata(CACHE_OPTIONS, cacheOptions);
};

export const CacheByProject = (options?: ICacheOptions) => {
  const cacheOptions: ICacheOptions = {
    ...defaultOptions,
    ...options,
    byProject: true,
  };
  return SetMetadata(CACHE_OPTIONS, cacheOptions);
};

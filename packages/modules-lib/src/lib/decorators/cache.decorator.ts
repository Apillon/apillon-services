import { SetMetadata } from '@nestjs/common';

export interface ICacheOptions {
  enabled?: boolean;
  byUser?: boolean;
  keyPrefix?: string;
  ttl?: number;
}
export const CACHE_OPTIONS = 'cache_options';

export const Cache = (options?: ICacheOptions) => {
  const defaultOptions: ICacheOptions = {
    enabled: true,
    byUser: true,
    keyPrefix: '',
  };

  const cacheOptions = { ...defaultOptions, ...options };
  return SetMetadata(CACHE_OPTIONS, cacheOptions);
};

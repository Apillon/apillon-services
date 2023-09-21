import { env } from '../config/env';
import * as redis from 'redis';

function flatObject(obj: Record<any, any>, joinChar = '/') {
  if (!obj) {
    return '';
  }
  return Object.keys(obj)
    .map((x) => `${x}:${obj[x]}`)
    .join(joinChar);
}

/**
 * function for generating cache keys
 * @param prefix unique per route cache prefix
 * @param query query params from request URL
 * @param params path params from request URL
 * @param user_uuid user uuid for per-user caching, pass null for global caching
 * @param project_uuid project uuid for per-project caching
 */
export function generateCacheKey(
  prefix: string,
  path: string,
  query: any,
  params: any,
  user_uuid: string,
  project_uuid: string,
) {
  return `${prefix}#${path}@${user_uuid ? `user_uuid:${user_uuid}` : ''}|${
    project_uuid ? `project_uuid:${project_uuid}` : ''
  }|${flatObject(params)}|${flatObject(query)}`;
}

/**
 * Returns values from cache if key is found, otherwise runs function and stores returned result in cache
 * @param key cache key
 * @param action function to be executed if no hit in cache
 * @param expire cache TTL
 */
export async function runCachedFunction(
  key: string,
  action: () => any,
  expire = env.DEFAULT_CACHE_TTL,
) {
  let cache: AppCache = null;
  let result: any;
  if (env.REDIS_URL) {
    // console.time('CHECK_CACHE');
    try {
      cache = new AppCache();
      await cache.connect();
      result = await cache.getKey(key);
      if (result) {
        console.info('[CACHE]: Returning function results from CACHE!');
        await cache.disconnect();
        // console.timeEnd('CHECK_CACHE');
        return result;
      }
    } catch (err) {
      console.error(`Error returning results from cache: ${err}`);
    }
  }
  // console.time('ACTION_CACHE');
  result = await action.call(this);
  // console.timeEnd('ACTION_CACHE');
  console.warn('[CACHE]: Missing key! Returning result from function!');

  if (cache) {
    // console.time('SET_CACHE');
    try {
      await cache.setKey(key, result, expire);
      await cache.disconnect();
    } catch (err) {
      console.error(`Error setting cache: ${err}`);
    }
    // console.timeEnd('SET_CACHE');
  } else {
    console.info('[CACHE]: Result is not saved to cache!');
  }

  return result;
}

/**
 * Tries to invalidate cache by deleting all keys with provided prefixes
 * @param prefixes array of cache key prefixes
 */
export async function invalidateCachePrefixes(
  prefixes: string[],
  user_uuid?: string,
  project_uuid?: string,
) {
  if (!env.REDIS_URL) {
    return;
  }
  const promises = [];
  const cache = new AppCache();
  await cache.connect();
  for (const prefix of prefixes) {
    promises.push(
      invalidateCacheMatch(prefix, { user_uuid, project_uuid }, cache),
    );
  }
  await Promise.all(promises);
  await cache.disconnect();
}

/**
 * Searches for appropriate key in cache and deletes it
 * @param keyPrefix cache key prefix
 * @param params parameters to match in key
 * @param user_uuid user ID for users personal cache
 */
export async function invalidateCacheMatch(
  keyPrefix: string,
  matchOptions?: {
    path?: string;
    params?: any;
    user_uuid?: string;
    project_uuid?: string;
  },
  cache: AppCache = null,
) {
  if (!env.REDIS_URL) {
    return;
  }
  const keyPattern =
    // key search pattern
    `${
      // key prefix
      keyPrefix
    }#${
      // endpoint path
      matchOptions?.path ? `${matchOptions?.path}:` : '*@'
    }${
      // user id
      matchOptions?.user_uuid ? `user_uuid:${matchOptions?.user_uuid}` : ''
    }*${
      // project uuid
      matchOptions?.project_uuid
        ? `project_uuid:${matchOptions?.project_uuid}`
        : ''
    }*${
      // custom parameters (query + body)
      flatObject(matchOptions?.params, '*')
    }*`;

  try {
    let isSingleCall = false;
    if (!cache) {
      cache = new AppCache();
      await cache.connect();
      isSingleCall = true;
    }
    await cache.removeMatch(keyPattern);
    if (isSingleCall) {
      await cache.disconnect();
    }
  } catch (err) {
    console.error(err);
  }
}

export async function invalidateCacheKey(key: string) {
  if (!env.REDIS_URL) {
    return;
  }
  try {
    const cache = new AppCache();
    await cache.connect();
    await cache.removeKey(key);
    await cache.disconnect();
  } catch (err) {
    console.error(err);
  }
}

/**
 * Clears all cache
 */
export async function flushCache() {
  if (!env.REDIS_URL) {
    return;
  }
  try {
    const cache = new AppCache();
    await cache.connect();
    await cache.flush();
    await cache.disconnect();
  } catch (err) {
    console.error(err);
  }
}

export class AppCache {
  private redisClient: redis.RedisClientType;
  // private cache: CachemanRedis;

  public async disconnect() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
      }
    } catch (err) {
      console.error(err);
    }
  }

  public async connect() {
    this.redisClient = redis.createClient({ url: env.REDIS_URL });
    await this.redisClient.connect();
  }

  public async getKey(key: string) {
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async setKey(key: string, data: any, expire = 30) {
    await this.redisClient.set(key, JSON.stringify(data), { EX: expire });
  }

  public async removeKey(key: string) {
    await this.redisClient.del(key);
  }

  public async removeMatch(keyPattern: string) {
    const keys = await this.redisClient.keys(keyPattern);
    if (keys.length) {
      // console.info(`[CACHE]: Removing keys: ${keys.join(', ')}`);
      await this.redisClient.del(keys);
    } else {
      console.warn(`[CACHE]: Found no keys to be removed.`);
    }
  }

  public async flush() {
    await this.redisClient.flushAll();
  }
}

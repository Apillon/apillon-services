import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, tap } from 'rxjs';
import {
  AppCache,
  AppEnvironment,
  CacheKeyPrefix,
  Context,
  env,
  generateCacheKey,
} from '@apillon/lib';
import { CACHE_OPTIONS, ICacheOptions } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  protected allowedMethods = ['GET'];

  constructor(@Inject(Reflector.name) private readonly reflector: Reflector) {}

  async intercept(
    execCtx: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = execCtx.switchToHttp().getRequest();
    const cacheDecoratorValue = this.reflector.getAllAndMerge<ICacheOptions[]>(
      CACHE_OPTIONS,
      [execCtx.getHandler(), execCtx.getClass()],
    );
    const cacheOptions: ICacheOptions = (
      cacheDecoratorValue.length ? cacheDecoratorValue[0] : cacheDecoratorValue
    ) as ICacheOptions;

    if (
      !cacheOptions?.enabled ||
      !this.allowedMethods.includes(request.method) ||
      env.APP_ENV === AppEnvironment.TEST
    ) {
      // console.info('[CACHE]: disabled!');
      return next.handle();
    }

    const context: Context = execCtx.getArgByIndex(0).context;
    const user_uuid = context?.user?.user_uuid;
    // If caching by project_uuid, check for that property in any of the request's receiving parameters
    const project_uuid =
      request.query?.project_uuid ||
      request.body?.project_uuid ||
      request.params?.project_uuid;

    const key = generateCacheKey({
      prefix: cacheOptions.keyPrefix as CacheKeyPrefix,
      path: request.route.path,
      query: request.query,
      params: request.params,
      user_uuid: cacheOptions.byUser ? user_uuid : null,
      project_uuid: cacheOptions.byProject ? project_uuid : null,
    });

    return this.runCachedInterception(key, next, cacheOptions.ttl);
  }

  /**
   * Returns values from cache if key is found, otherwise runs function and stores returned result in cache
   * @param key cache key
   * @param next: CallHandler
   * @param expire cache TTL
   */
  private async runCachedInterception(
    key: string,
    next: CallHandler,
    expire: number,
  ) {
    let result: any;
    if (!env.REDIS_URL) {
      console.warn('[CACHE]: Cache disabled! (REDIS_URL missing)');
      return next.handle();
    }
    const cache = new AppCache();

    // console.time('CHECK_CACHE');
    try {
      await cache.connect();
      result = await cache.getKey(key);
      if (result) {
        // console.info('[CACHE]: Returning results from CACHE!');
        await cache.disconnect();
        // console.timeEnd('CHECK_CACHE');
        return of(result);
      }
    } catch (err) {
      console.error(`[CACHE]: Error setting redis cache: ${err}`);
    }
    // console.timeEnd('CHECK_CACHE');

    return next.handle().pipe(
      tap(async (response) => {
        if (response instanceof StreamableFile) {
          return;
        }

        // console.info('[CACHE]: Missing key. Returning results from API!');
        try {
          await cache.connect();
          await cache.setKey(key, response, expire);
          await cache.disconnect();
          // console.info('[CACHE]: Response cached!');
        } catch (err) {
          console.error(`[CACHE]: Error, result is not saved to cache: ${err}`);
        }
      }),
    );
  }
}

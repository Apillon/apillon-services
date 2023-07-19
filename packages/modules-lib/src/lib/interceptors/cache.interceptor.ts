import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, tap } from 'rxjs';
import { AppCache, Context, env, generateCacheKey } from '@apillon/lib';
import { CACHE_OPTIONS, ICacheOptions } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  protected allowedMethods = ['GET'];
  constructor(private reflector: Reflector) {}

  async intercept(
    execCtx: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheDecoratorValue = this.reflector.getAllAndMerge<ICacheOptions[]>(
      CACHE_OPTIONS,
      [execCtx.getHandler(), execCtx.getClass()],
    );
    const cacheOptions: ICacheOptions = (
      cacheDecoratorValue.length ? cacheDecoratorValue[0] : cacheDecoratorValue
    ) as ICacheOptions;
    const context: Context = execCtx.getArgByIndex(0).context;
    const request = execCtx.switchToHttp().getRequest();
    const userId = context?.user?.id;
    // If caching by project_uuid, check for that property in any of the request's receiving parameters
    const projectUuid =
      request.query['project_uuid'] ||
      request.body['project_uuid'] ||
      request.params['project_uuid'];

    if (
      !cacheOptions?.enabled ||
      !this.allowedMethods.includes(request.method)
    ) {
      console.info('CACHE: disabled!');
      return next.handle();
    }

    const key = generateCacheKey(
      cacheOptions.keyPrefix,
      request.route.path,
      request.query,
      request.params,
      cacheOptions.byUser ? userId : null,
      cacheOptions.byProject ? projectUuid : null,
    );

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
      console.warn('CACHE: Cache disabled! (REDIS_URL missing)');
      return next.handle();
    }
    const cache = new AppCache();

    // console.time('CHECK_CACHE');
    try {
      await cache.connect();
      result = await cache.getKey(key);
      if (result) {
        console.info('CACHE: Returning results from CACHE!');
        await cache.disconnect();
        // console.timeEnd('CHECK_CACHE');
        return of(result);
      }
    } catch (err) {
      console.error(`Error setting redis cache: ${err}`);
    }
    // console.timeEnd('CHECK_CACHE');

    return next.handle().pipe(
      tap(async (response) => {
        if (response instanceof StreamableFile) {
          return;
        }

        console.info('CACHE: Missing key. Returning results from API!');
        try {
          await cache.connect();
          await cache.setKey(key, response, expire);
          await cache.disconnect();
          console.info('CACHE: Response cached!');
        } catch (err) {
          console.error(`CACHE ERROR: Result is not saved to cache: ${err}`);
        }
      }),
    );
  }
}

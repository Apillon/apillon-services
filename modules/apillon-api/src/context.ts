import {
  Ams,
  CacheKeyPrefix,
  CacheKeyTTL,
  CodeException,
  Context,
  UnauthorizedErrorCodes,
  runCachedFunction,
} from '@apillon/lib';
import { HttpStatus } from '@nestjs/common';

export class ApillonApiContext extends Context {
  /**
   * Validate API key and fill context apiKey property
   */
  async authenticate(apiKey: string, apiKeySecret: string) {
    const apiKeyData = await runCachedFunction(
      `${CacheKeyPrefix.AUTH_USER_DATA}:${apiKey}`,
      () =>
        new Ams(this).getApiKey({
          apiKey,
          apiKeySecret,
        }),
      CacheKeyTTL.EXTRA_LONG,
    );

    if (apiKeyData?.data.id) {
      this.apiKey = apiKeyData.data;
    } else {
      throw new CodeException({
        code: UnauthorizedErrorCodes.UNAUTHORIZED,
        status: HttpStatus.UNAUTHORIZED,
        errorMessage: 'Invalid Authorization header credentials',
      });
    }
  }
}

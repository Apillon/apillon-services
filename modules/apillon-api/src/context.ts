import {
  Ams,
  CodeException,
  Context,
  UnauthorizedErrorCodes,
} from '@apillon/lib';
import { HttpStatus } from '@nestjs/common';

export class ApillonApiContext extends Context {
  /**
   * Validate API key and fill context apiKey property
   */
  async authenticate(apiKey: string, apiKeySecret: string) {
    const apiKeyData = await new Ams(this).getApiKey({
      apiKey,
      apiKeySecret,
    });

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

  isApiKeyValid() {
    return this.apiKey?.id;
  }
}

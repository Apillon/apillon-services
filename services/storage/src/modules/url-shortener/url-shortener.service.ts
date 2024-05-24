import { SerializeFor, ShortUrlDto } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ShortUrl } from './models/short-url.model';
import { StorageCodeException } from '../../lib/exceptions';
import { StorageErrorCode } from '../../config/types';

export class UrlShortenerService {
  public static async generateShortUrl(
    event: ShortUrlDto,
    context: ServiceContext,
  ) {
    event.targetUrl = event.targetUrl?.trim(); //do not convert to lower case! (would break JWT param)

    const existingShortUrl = await new ShortUrl({}, context).populateByTarget(
      event.targetUrl,
    );
    if (existingShortUrl.exists()) {
      return existingShortUrl;
    }

    return (await new ShortUrl({}, context).generateShortUrl(event)).serialize(
      SerializeFor.SERVICE,
    );
  }

  public static async getTargetUrl(
    event: { shortUrl_id: string },
    context: ServiceContext,
  ) {
    const shortUrl = await new ShortUrl({}, context).populateById(
      event.shortUrl_id,
    );
    if (!shortUrl.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.DEFAULT_RESOURCE_NOT_FOUND_ERROR,
        status: 404,
        context: context,
        errorMessage: 'Short URL key is not valid or does not exists',
      });
    }
    return shortUrl.targetUrl;
  }
}

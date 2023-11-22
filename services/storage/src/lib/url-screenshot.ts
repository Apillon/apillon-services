import { AppEnvironment, BaseService, Context, env } from '@apillon/lib';
import axios from 'axios';
import { StorageErrorCode } from '../config/types';
import { StorageCodeException } from './exceptions';

export class UrlScreenshotMicroservice extends BaseService {
  lambdaFunctionName = env.URL_SCREENSHOT_FUNCTION_NAME;
  devPort: number;
  serviceName: string;

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  /**
   * Call function (lambda/api), which creates screenshot of website and puts it on S3
   * @param project_uuid project
   * @param url url of website for screenshot
   * @param key aws s3 key - used for file naming
   * @returns
   */
  public async getUrlScreenshot(
    project_uuid: string,
    url: string,
    key: string,
  ): Promise<string> {
    try {
      if (
        [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
          env.APP_ENV as AppEnvironment,
        )
      ) {
        //Call API
        const urlScreenshotRes = await axios.post(env.URL_SCREENSHOT_API_URL, {
          urls: [{ url, key }],
        });
        if (urlScreenshotRes.data?.length && urlScreenshotRes.data[0].s3Link) {
          return urlScreenshotRes.data[0].s3Link;
        }
      } else {
        //Call lambda
        const lambdaResponse = await this.callService({ urls: [{ url, key }] });
        console.info('Response from url screenshot lambda', lambdaResponse);
        return lambdaResponse.data?.length
          ? lambdaResponse.data[0].s3Link
          : undefined;
      }
    } catch (err) {
      await new StorageCodeException({
        code: StorageErrorCode.URL_SCREENSHOT_UNHANDLED_EXCEPTION,
        status: 500,
        sourceFunction: 'getUrlScreenshot',
        errorMessage: 'Error getting url screenshot',
        details: {
          url,
          err,
        },
      }).writeToMonitor({ project_uuid });
    }

    return undefined;
  }
}

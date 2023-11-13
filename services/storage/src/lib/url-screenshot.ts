import { AppEnvironment, CodeException, Context } from '@apillon/lib';
import { BaseService, env } from '@apillon/lib';
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
   *
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
        const urlScreenshotRes = await axios.post(
          'https://qxpmy330v3.execute-api.eu-west-1.amazonaws.com/dev/',
          { urls: [{ url, key }] },
        );
        if (urlScreenshotRes.data?.length && urlScreenshotRes.data[0].s3Link) {
          return urlScreenshotRes.data[0].s3Link;
        }
      } else {
        //Call lambda
        const lambdaResponse = await this.callService({ urls: [{ url, key }] });
        console.info('Response from url screenshot lambda', lambdaResponse);
        return lambdaResponse;
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

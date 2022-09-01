import * as AWS from 'aws-sdk';
import { env, getEnvSecrets } from '../../config/env';
import { AmsEventType } from '../../config/types';

/**
 * Access Management Service client
 */
export class Ams {
  private lambda: AWS.Lambda;
  constructor() {
    this.lambda = new AWS.Lambda({
      apiVersion: '2015-03-31',
      region: env.AWS_REGION,
    });
  }

  public async IsUserAuthenticated(
    userId: number,
    projectId: number,
    securityToken: string,
  ) {
    const data = {
      eventName: AmsEventType.USER_AUTH,
      userId,
      projectId,
      securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);
    //TODO: do something with AMS response?

    return amsResponse;
  }

  private async callService(payload) {
    const env = await getEnvSecrets();

    const params: AWS.Lambda.InvocationRequest = {
      FunctionName: env.AT_AMS_FUNCTION_NAME,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload),
    };

    return await new Promise((resolve, reject) => {
      this.lambda.invoke(params, (err, response) => {
        if (err) {
          console.error('Error invoking lambda!', err);
          reject(err);
        }
        resolve(response);
      });
    });
  }
}

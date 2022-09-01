import * as AWS from 'aws-sdk';
import { env, getEnvSecrets } from '../../config/env';
import { LmasEventType } from '../../config/types';

/**
 * Logging / Monitoring / Alerting Service client
 */
export class Lmas {
  private lambda = null;
  constructor() {
    this.lambda = new AWS.Lambda({
      apiVersion: '2015-03-31',
      region: env.AWS_REGION,
    });
  }

  public async writeLog(
    projectId: number,
    logType: string,
    message: string,
    location: string,
    securityToken: string,
  ) {
    const data = {
      eventName: LmasEventType.WRITE_LOG,
      projectId,
      logType,
      message,
      location,
      securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const lmasResponse = await this.callService(data);
    //TODO: do something with response?

    return lmasResponse;
  }

  private async callService(payload, isAsync = true) {
    // const env = await getEnvSecrets(); //should there be any???

    const params: AWS.Lambda.InvocationRequest = {
      FunctionName: env.AT_LMAS_FUNCTION_NAME,
      InvocationType: isAsync ? 'Event' : 'RequestResponse',
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

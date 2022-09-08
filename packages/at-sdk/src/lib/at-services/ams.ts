import * as AWS from 'aws-sdk';
import { env, getEnvSecrets } from '../../config/env';
import { AmsEventType, AppEnvironment } from '../../config/types';
import * as Net from 'net';

/**
 * Access Management Service client
 */
export class Ams {
  private lambda: AWS.Lambda;
  constructor() {
    this.lambda = new AWS.Lambda({
      apiVersion: '2015-03-31',
      region: env.AWS_REGION,
      //   endpoint:
      //     env.APP_ENV === AppEnvironment.DEV
      //       ? `localhost:${env.AT_LMAS_SOCKET_PORT}`
      //       : undefined,
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

    if (env.APP_ENV === AppEnvironment.LOCAL_DEV) {
      return await this.callDevService(payload);
    }

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

  private async callDevService(payload) {
    const devSocket = Net.connect(
      { port: env.AT_AMS_SOCKET_PORT, timeout: 30000 },
      () => {
        console.log('Connected to AMS dev socket');
      },
    );
    devSocket.on('error', () => {
      throw new Error('Socket error!');
    });

    return await new Promise((resolve, reject) => {
      devSocket.on('data', (data) => {
        devSocket.destroy();
        resolve(JSON.parse(data.toString()));
      });
      devSocket.write(JSON.stringify(payload), (err) => {
        if (err) {
          devSocket.destroy();
          reject(err);
        }
      });
    });
  }
}

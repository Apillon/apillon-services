import * as AWS from 'aws-sdk';
import { env } from '../../config/env';
import { AppEnvironment, LmasEventType } from '../../config/types';
import * as Net from 'net';

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

    if (env.APP_ENV === AppEnvironment.LOCAL_DEV) {
      return await this.callDevService(payload, isAsync);
    }

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

  private async callDevService(payload, isAsync) {
    const devSocket = Net.connect(
      { port: env.AT_LMAS_SOCKET_PORT, timeout: 30000 },
      () => {
        console.log('Connected to LMAS dev socket');
      },
    );
    devSocket.on('error', (err) => {
      console.error(err);
      throw new Error('Socket error!');
    });

    return await new Promise((resolve, reject) => {
      devSocket.on('data', (data) => {
        devSocket.destroy();
        resolve(JSON.parse(data.toString()));
      });
      devSocket.write(JSON.stringify(payload), (err) => {
        devSocket.destroy();
        if (err) {
          reject(err);
        }
        if (isAsync) {
          resolve(null);
        }
      });
    });
  }
}

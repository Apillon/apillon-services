import * as AWS from 'aws-sdk';
import { env } from '../../config/env';
import { AppEnvironment, LogType, StorageEventType } from '../../config/types';
import * as Net from 'net';

/**
 * Logging / Monitoring / Alerting Service client
 */
export class Storage {
  private lambda = null;
  constructor() {
    this.lambda = new AWS.Lambda({
      apiVersion: '2015-03-31',
      region: env.AWS_REGION,
    });
  }

  public async addFileToIPFS() {
    const data = {
      eventName: StorageEventType.ADD_FILE_TO_IPFS,
    };
    await this.callService(data);
  }

  private async callService(payload, isAsync = true) {
    // const env = await getEnvSecrets(); //should there be any???

    if (env.APP_ENV === AppEnvironment.LOCAL_DEV) {
      return await this.callDevService(payload, isAsync);
    }

    const params: AWS.Lambda.InvocationRequest = {
      FunctionName: env.AT_STORAGE_FUNCTION_NAME,
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
      { port: env.AT_STORAGE_SOCKET_PORT, timeout: 30000 },
      () => {
        console.log('Connected to STORAGE dev socket');
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

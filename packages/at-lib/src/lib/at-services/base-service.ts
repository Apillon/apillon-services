import { env, getEnvSecrets } from '../../config/env';
import { AppEnvironment } from '../../config/types';
import * as Net from 'net';
import AWS from 'aws-sdk';

export abstract class BaseService {
  private lambda: AWS.Lambda;
  protected isDefaultAsync = false;
  abstract lambdaFunctionName: string;
  abstract devPort: number;
  abstract serviceName: string;

  constructor() {
    this.lambda = new AWS.Lambda({
      apiVersion: '2015-03-31',
      region: env.AWS_REGION,
    });
  }

  protected async callService(payload, isAsync = this.isDefaultAsync) {
    const env = await getEnvSecrets();

    if (env.APP_ENV === AppEnvironment.LOCAL_DEV) {
      return await this.callDevService(payload, isAsync);
    }

    const params: AWS.Lambda.InvocationRequest = {
      FunctionName: this.lambdaFunctionName,
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

  protected async callDevService(payload, isAsync) {
    const devSocket = Net.connect(
      { port: this.devPort, timeout: 30000 },
      () => {
        console.log(`Connected to ${this.serviceName} dev socket`);
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

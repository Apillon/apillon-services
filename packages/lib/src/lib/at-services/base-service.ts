import { env, getEnvSecrets } from '../../config/env';
import { AppEnvironment } from '../../config/types';
import * as Net from 'net';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { safeJsonParse } from '../utils';
import { Context } from '../context';

export abstract class BaseService {
  private lambda: LambdaClient;
  protected isDefaultAsync = false;
  abstract lambdaFunctionName: string;
  abstract devPort: number;
  abstract serviceName: string;
  protected securityToken: string;
  private requestId: string;
  private user: any;
  private apiKey: any;

  constructor(context?: Context) {
    this.lambda = new LambdaClient({
      credentials: {
        accessKeyId: env.AWS_KEY,
        secretAccessKey: env.AWS_SECRET,
      },
      region: env.AWS_REGION,
    });
    this.securityToken = this.generateSecurityToken();
    this.requestId = context?.requestId;
    this.user = context?.user;
    this.apiKey = context?.apiKey;
  }

  private generateSecurityToken() {
    //TODO - generate JWT from APP secret
    return 'SecurityToken';
  }

  protected async callService(payload, isAsync = this.isDefaultAsync) {
    const env = await getEnvSecrets();
    let result;

    payload = {
      securityToken: this.securityToken,
      requestId: this.requestId,
      user: this.user,
      apiKey: this.apiKey,
      ...payload,
    };

    if (
      [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
        env.APP_ENV as AppEnvironment,
      )
    ) {
      result = await this.callDevService(payload, isAsync);
    } else {
      const command = new InvokeCommand({
        FunctionName: this.lambdaFunctionName,
        InvocationType: isAsync ? 'Event' : 'RequestResponse',
        Payload: payload,
      });

      try {
        result = safeJsonParse(
          (await this.lambda.send(command)).Payload.toString(),
        );
      } catch (err) {
        console.error('Error invoking lambda!', err);
      }

      // const params: InvocationRequest = {
      //   FunctionName: this.lambdaFunctionName,
      //   InvocationType: isAsync ? 'Event' : 'RequestResponse',
      //   Payload: JSON.stringify(payload),
      // };

      // result = await new Promise((resolve, reject) => {
      //   this.lambda.invoke(params, (err, response) => {
      //     if (err) {
      //       console.error('Error invoking lambda!', err);
      //       reject(err);
      //     }
      //     resolve(safeJsonParse(response.Payload.toString()));
      //   });
      // });
    }
    console.log(result);

    if (!isAsync && (result?.FunctionError || !result?.success)) {
      // CodeException causes circular dependency!

      if (result?.status == 422) {
        //Validation errors returned from microservice
        throw {
          status: 422,
          errors: result?.error.errors,
        };
      }
      throw {
        status: result?.status || 500,
        message: result?.error?.message || result?.error.errorMessage,
        code: result?.error?.errorCode,
      };
    }

    return result;
  }

  protected async callDevService(payload, isAsync) {
    const devSocket = Net.connect(
      { port: this.devPort, timeout: 300000 },
      () => {
        //console.log(`Connected to ${this.serviceName} dev socket`);
      },
    );

    return await new Promise((resolve, reject) => {
      devSocket.on('error', () => {
        devSocket.destroy();
        reject('Socket error!');
      });
      devSocket.on('timeout', () => {
        console.log('socket timeout');
        devSocket.destroy();
        reject('Socket timeout!');
      });
      devSocket.on('end', () => {
        //console.log(`Disconnected from ${this.serviceName} dev socket`);
        resolve(null);
      });
      devSocket.on('data', (data) => {
        devSocket.destroy();
        resolve(JSON.parse(data.toString()));
      });
      devSocket.write(JSON.stringify(payload), (err) => {
        if (err) {
          reject(err);
        }
        if (isAsync) {
          devSocket.destroy();
          resolve(null);
        }
      });
    });
  }
}

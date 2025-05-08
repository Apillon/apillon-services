import { getEnvSecrets } from '../../config/env';
import { ApiName, AppEnvironment } from '../../config/types';
import * as Net from 'net';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { safeJsonParse } from '../utils';
import { Context } from '../context';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { SendMessageCommandInput } from '@aws-sdk/client-sqs';

export abstract class BaseService {
  protected isDefaultAsync = false;
  protected defaultQueueUrl: string = null;
  abstract lambdaFunctionName: string;
  abstract devPort: number;
  abstract serviceName: string;
  protected securityToken: string;
  private requestId: string;
  private user: any;
  private apiKey: any;
  private apiName: ApiName;

  constructor(context?: Context) {
    this.securityToken = this.generateSecurityToken();
    this.requestId = context?.requestId;
    this.user = context?.user;
    this.apiKey = context?.apiKey;
    this.apiName = context?.apiName;
  }

  private generateSecurityToken() {
    //TODO - generate JWT from APP secret
    return 'SecurityToken';
  }

  protected async callService(
    payload: any,
    options?: {
      isAsync?: boolean;
      queueUrl?: string;
    },
  ) {
    const queueUrl = options?.queueUrl || this.defaultQueueUrl;
    const isAsync = options?.isAsync ?? (!!queueUrl || this.isDefaultAsync);

    const env = await getEnvSecrets();
    let result;

    payload = {
      securityToken: this.securityToken,
      requestId: this.requestId,
      user: this.user,
      apiKey: this.apiKey,
      apiName: this.apiName,
      ...payload,
    };

    if (
      [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
        env.APP_ENV as AppEnvironment,
      ) &&
      !process.env.LAMBDA_TASK_ROOT &&
      !process.env.CODEBUILD_CI
    ) {
      result = await this.callDevService(payload, isAsync);
    } else if (queueUrl) {
      // send msg to SQS
      const sqs = new SQSClient({
        // credentials: {
        //   accessKeyId: env.AWS_KEY,
        //   secretAccessKey: env.AWS_SECRET,
        // },
        region: env.AWS_REGION,
      });
      const message: SendMessageCommandInput = {
        // Remove DelaySeconds parameter and value for FIFO queues
        //  DelaySeconds: 10,
        MessageBody: JSON.stringify(payload),
        // MessageDeduplicationId: 'TheWhistler',  // Required for FIFO queues
        // MessageGroupId: 'Group1',  // Required for FIFO queues
        QueueUrl: queueUrl,
      };
      try {
        const command = new SendMessageCommand(message);
        result = await sqs.send(command);
      } catch (err) {
        console.error('Apillon MS: Error sending SQS message!', err);
      }
    } else {
      // invoke lambda
      const lambda = new LambdaClient({
        // credentials: {
        //   accessKeyId: env.AWS_KEY,
        //   secretAccessKey: env.AWS_SECRET,
        // },
        region: env.AWS_REGION,
      });
      const command = new InvokeCommand({
        FunctionName: this.lambdaFunctionName,
        InvocationType: isAsync ? 'Event' : 'RequestResponse',
        Payload: Buffer.from(JSON.stringify(payload)),
      });

      try {
        const { Payload } = await lambda.send(command);
        result = safeJsonParse(Buffer.from(Payload).toString());
      } catch (err) {
        console.error('Error invoking lambda!', err);
      }
    }
    // console.log(result);

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
        message:
          // do not display lambda/function names
          result?.error?.message ||
          result?.error?.errorMessage ||
          `Error calling internal service!`,
        code: result?.error?.errorCode,
      };
    }

    return result;
  }

  protected async callDevService(payload, isAsync) {
    console.log(`Connecting to DEV server...`);
    const devSocket = Net.connect(
      { port: this.devPort, timeout: 300000, host: '127.0.0.1' },
      () => {
        console.log(`Connected to ${this.serviceName} dev socket`);
      },
    );

    return await new Promise((resolve, reject) => {
      let messageReceived = '';
      devSocket.on('error', (e) => {
        devSocket.destroy();
        reject(e);
      });
      devSocket.on('timeout', () => {
        console.log('socket timeout');
        devSocket.destroy();
        reject('Socket timeout!');
      });
      devSocket.on('end', () => {
        console.log(`Disconnected from ${this.serviceName} dev socket`);
        resolve(null);
      });
      devSocket.on('data', (chunk) => {
        messageReceived += chunk.toString();
        if (messageReceived.endsWith('</EOF>')) {
          messageReceived = messageReceived.replace('</EOF>', '');
          devSocket.destroy();
          resolve(JSON.parse(messageReceived.toString()));
        } else {
          console.log(`Partial data received: ${messageReceived} `);
        }
      });
      devSocket.write(`${JSON.stringify(payload)}</EOF>`, (err) => {
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

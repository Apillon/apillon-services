import { env, MySql } from '@apillon/lib';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import type { InvokeCommandInput } from '@aws-sdk/client-lambda';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { SendMessageCommandInput } from '@aws-sdk/client-sqs';
import { PoolConnection } from 'mysql2/promise';
import { DbTables } from '../../config/types';
import { ServiceDefinitionType } from './interfaces';
import { WorkerDefinition } from './worker-definition';

export abstract class ServerlessWorker {
  /**
   * worker definition
   */
  public workerDefinition: WorkerDefinition;

  /**
   * @param workerDefinition worker definition
   */
  public constructor(workerDefinition: WorkerDefinition) {
    this.workerDefinition = workerDefinition;
  }

  /**
   * Code to execute before main function execution
   * @param data non-mandatory data for function
   */
  public abstract before(data?: any): Promise<any>;

  /**
   * Code to execute main function. Should contain all relevant business logic.
   * @param data non-mandatory data for function
   */
  public abstract execute(data?: any): Promise<any>;

  /**
   * Code to execute on main function execution success
   * @param data non-mandatory data for function
   * @param successData non-mandatory data obtained from successful lambda
   */
  public abstract onSuccess(data?: any, successData?: any): Promise<any>;

  /**
   * Code to execute in case of error
   * @param error mandatory error data
   */
  public abstract onError(error: Error): Promise<any>;

  public abstract onUpdateWorkerDefinition(): Promise<void>;

  public abstract onAutoRemove(): Promise<void>;

  /**
   * invokes lambdas and/or send messages to queue (for example for async invocations of lambdas)
   * @param options lambda and/or sqs que definitions
   */
  public async launchWorkers(
    workersDefinitions: Array<WorkerDefinition>,
  ): Promise<any> {
    const promises = [];
    for (const def of workersDefinitions) {
      const serviceDefinition = def.serviceDefinition;
      if (serviceDefinition.type == ServiceDefinitionType.SQS) {
        // const sqs = new AWS.SQS(serviceDefinition.config);
        const sqs = new SQSClient({
          ...serviceDefinition.config,
          // credentials: {
          //   accessKeyId: env.AWS_KEY,
          //   secretAccessKey: env.AWS_SECRET,
          // },
          region: env.AWS_REGION,
        });

        const params: SendMessageCommandInput = {
          ...(serviceDefinition.params as SendMessageCommandInput),
          MessageBody: JSON.stringify(def),
        };
        const command = new SendMessageCommand(params);

        promises.push(
          sqs.send(command),
          // new Promise((resolve, reject) => {
          //   sqs.sendMessage(params, (err, data) => {
          //     if (err) {
          //       this.logFn('Error sending SQS message', err);
          //       reject(err);
          //     }
          //     if (data) {
          //       // this.logFn(`Message sent to SQS: ${data ? data : ''}`);
          //     }
          //     // ATM always resolve
          //     resolve(data);
          //   });
          // }),
        );
      }
      if (serviceDefinition.type == ServiceDefinitionType.LAMBDA) {
        // const lambda = new AWS.Lambda(serviceDefinition.config);
        const lambda = new LambdaClient({
          ...serviceDefinition.config,
          // credentials: {
          //   accessKeyId: env.AWS_KEY,
          //   secretAccessKey: env.AWS_SECRET,
          // },
          region: env.AWS_REGION,
        });

        const params: InvokeCommandInput = {
          ...(serviceDefinition.params as InvokeCommandInput),
          InvocationType: 'Event',
          Payload: JSON.parse(JSON.stringify(def)),
        };

        const command = new InvokeCommand(params);

        promises.push(
          lambda.send(command),
          // new Promise((resolve, reject) => {
          //   lambda.invoke(params, (err, data) => {
          //     if (err) {
          //       this.logFn('Error invoking Lambda', err);
          //       reject(err);
          //     }
          //     if (data) {
          //       // this.logFn(`Lambda invoked: ${data ? JSON.stringify(data) : ''}`);
          //     }
          //     // ATM always resolve
          //     resolve(data);
          //   });
          // }),
        );
      }
    }
    await Promise.all(promises);
  }

  public async updateOnStarted() {
    this.workerDefinition.setStarted();
    await this.onUpdateWorkerDefinition();
  }
  public async updateOnCompleted() {
    this.workerDefinition.setCompleted();
    if (this.workerDefinition.autoRemove) {
      await this.onAutoRemove();
    }
    await this.onUpdateWorkerDefinition();
  }
  public async updateOnError(error: Error) {
    this.workerDefinition.setFailed(error);
    await this.onUpdateWorkerDefinition();
  }

  /**
   * This is the function that executes all code in order. This should not be overwritten/changed.
   * @param data optional data for lambda execution
   * Execution goes in order: `before` -> `execute` --> `onSuccess` --> updateWorkerDefinition`. In case of error `onError` is executed.
   */
  public async run(
    data: {
      beforeArg?: any;
      executeArg?: any;
      afterArg?: any;
    } = {},
  ) {
    try {
      await this.before(data.beforeArg);
      await this.updateOnStarted();
      const successData = await this.execute(data.executeArg);
      await this.onSuccess(data.afterArg, successData);
      await this.updateOnCompleted();
    } catch (error) {
      await this.onError(error);
      try {
        await this.updateOnError(error);
      } catch (err) {
        this.logFn('Error updating definition', err);
      }
      throw error;
    }
  }

  /**
   * Logging function - could be overridden to log to database etc.
   * @param message
   * @param err Error object
   * @param _options any additional options for overiding function
   */
  protected logFn(message: string, err?: Error, _options?: any) {
    console.log(`${this.workerDefinition?.workerName}: ${message}`);
    if (err) {
      console.error(err);
    }
  }

  public async resetExecutorCount(
    mysql: MySql,
    conn?: PoolConnection,
  ): Promise<void> {
    const query = `UPDATE \`${DbTables.JOB}\` SET executorCount = 0 WHERE id = @id`;
    await mysql.paramExecute(query, { id: this.workerDefinition.id }, conn);
  }

  public async addToExecutorCount(
    mysql: MySql,
    conn?: PoolConnection,
  ): Promise<any> {
    try {
      if (!this.workerDefinition.id) {
        return;
      }
      const query = 'CALL `addAndSelect`(@id);';
      const response = await mysql.paramExecute(
        query,
        { id: this.workerDefinition.id },
        conn,
      );
      return response && response[0] && response[0][0]
        ? response[0][0]?.executorCount
        : null;
    } catch (err) {
      console.log('Unable to add to executor count!', err);
    }
  }

  public async subtractExecutorCount(
    mysql: MySql,
    conn?: PoolConnection,
  ): Promise<any> {
    try {
      if (!this.workerDefinition.id) {
        return;
      }
      const query = 'CALL `subtractAndSelect`(@id);';
      const response = await mysql.paramExecute(
        query,
        { id: this.workerDefinition.id },
        conn,
      );
      return response && response[0] && response[0][0]
        ? response[0][0]?.executorCount
        : null;
    } catch (err) {
      console.log('Unable to subtract from executor count!', err);
    }
  }
}

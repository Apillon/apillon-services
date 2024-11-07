import { Context } from '@apillon/lib';
import { WorkerDefinition } from '.';
import { DbTables, WorkerLogStatus, QueueWorkerType } from '../../config/types';
import { Job } from '../../modules/job/job.model';
import { sendToWorkerQueue } from '../aws-sqs';
import { BaseWorker } from './base-worker';

export abstract class BaseQueueWorker extends BaseWorker {
  protected context: Context = null;
  protected workerType: QueueWorkerType;
  protected workerName: string = undefined;
  protected workerQueueUrl: string;

  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
    queueUrl: string,
  ) {
    super(workerDefinition, context);
    this.workerType = type;
    this.context = context;
    this.workerName = workerDefinition.workerName;
    this.workerQueueUrl = queueUrl;
  }

  public abstract runPlanner(data?: any): Promise<Array<any>>;
  public abstract runExecutor(data: any): Promise<any>;

  public async before(): Promise<any> {
    // await this.writeLogToDb(WorkerLogStatus.START, 'Job started!');
  }

  public async execute(data?: any): Promise<any> {
    if (this.workerType === QueueWorkerType.PLANNER) {
      await this.writeLogToDb(WorkerLogStatus.START, 'Started PLANNER worker');

      // sends message to SQS queue to trigger new executor
      const msgData = await this.runPlanner(data);

      if (!msgData || !msgData.length) {
        await this.writeLogToDb(
          WorkerLogStatus.INFO,
          'No data for SQS messaging!',
        );
        return;
      }
      await this.writeLogToDb(
        WorkerLogStatus.INFO,
        `Sending ${msgData.length} messages to queue!`,
      );

      const { errCount, errMsgs } = await sendToWorkerQueue(
        this.workerQueueUrl,
        this.workerName,
        msgData,
        this.workerDefinition.id,
        this.workerDefinition.parameters,
      );
      if (errCount) {
        await this.writeLogToDb(
          WorkerLogStatus.ERROR,
          'Errors detected while sending messages to queue!',
          errMsgs,
          null,
        );
      }
    } else if (this.workerType === QueueWorkerType.EXECUTOR) {
      await this.writeLogToDb(WorkerLogStatus.START, 'Started EXECUTOR worker');
      if (!data) {
        await this.writeLogToDb(
          WorkerLogStatus.ERROR,
          'No data found in queue message!',
          null,
          null,
        );
        return;
      }
      // await this.writeLogToDb(WorkerLogStatus.INFO, 'SQS message', JSON.parse(data));
      // we got data from SQS queue --> run executor
      await this.runExecutor(JSON.parse(data));
    }
  }

  public async onUpdateWorkerDefinition(): Promise<void> {
    // this.logFn(`MailerWorker event - update definition: ${this.workerDefinition}`);
    if (this.workerType === QueueWorkerType.PLANNER) {
      await new Job({}, this.context).updateWorkerDefinition(
        this.workerDefinition,
      );
    }
  }

  public async onSuccess(): Promise<any> {
    await this.writeLogToDb(WorkerLogStatus.SUCCESS, 'Job completed!');
  }

  public async onError(error, data?): Promise<any> {
    await this.writeLogToDb(WorkerLogStatus.ERROR, 'Error!', data, error);
    throw error;
  }

  public async onAutoRemove(): Promise<any> {
    await this.context.mysql.paramExecute(
      `DELETE FROM ${DbTables.JOB} WHERE id = @id`,
      { id: this.workerDefinition.id },
    );
  }
}

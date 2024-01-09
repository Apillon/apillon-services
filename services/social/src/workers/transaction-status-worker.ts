import {
  Context,
  env,
  LogType,
  runWithWorkers,
  ServiceName,
  SqlModelStatus,
  TransactionStatus,
  TransactionWebhookDataDto,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { DbTables } from '../config/types';
import { Post } from '../modules/subsocial/models/post.model';
import { Space } from '../modules/subsocial/models/space.model';

export class TransactionStatusWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.STORAGE_AWS_WORKER_SQS_URL);
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }
  public async runExecutor(input: {
    data: TransactionWebhookDataDto[];
  }): Promise<any> {
    console.info('RUN EXECUTOR (TransactionStatusWorker). data: ', input);

    await runWithWorkers(input.data, 50, this.context, async (data, ctx) => {
      if (data.referenceTable == DbTables.SPACE) {
        const space = await new Space({}, this.context).populateByUUID(
          data.referenceId,
        );
        if (!space.exists()) {
          await this.writeEventLog(
            {
              logType: LogType.WARN,
              message: 'No space matching reference found.',
              service: ServiceName.SOCIAL,
              data: {
                data,
              },
            },
            LogOutput.SYS_WARN,
          );
        } else {
          space.spaceId = data.data;
          space.status =
            data.transactionStatus == TransactionStatus.CONFIRMED
              ? SqlModelStatus.ACTIVE
              : 100;
          await space.update();
        }
      } else if (data.referenceTable == DbTables.POST) {
        const post = await new Post({}, this.context).populateByUUID(
          data.referenceId,
        );
        if (!post.exists()) {
          await this.writeEventLog(
            {
              logType: LogType.WARN,
              message: 'No post matching reference found.',
              service: ServiceName.SOCIAL,
              data: {
                data,
              },
            },
            LogOutput.SYS_WARN,
          );
        } else {
          post.postId = data.postId;
          post.status =
            data.transactionStatus == TransactionStatus.CONFIRMED
              ? SqlModelStatus.ACTIVE
              : 100;
        }
      } else {
        await this.writeEventLog(
          {
            logType: LogType.WARN,
            message: 'Got message without reference',
            service: ServiceName.SOCIAL,
            data: {
              data,
            },
          },
          LogOutput.SYS_WARN,
        );
      }
    });

    return true;
  }
}

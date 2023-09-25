import {
  Context,
  env,
  LogType,
  runWithWorkers,
  ServiceName,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { DbTables, FileStatus } from '../config/types';
import { File } from '../modules/storage/models/file.model';

export class UpdateCrustStatusWorker extends BaseQueueWorker {
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
  public async runExecutor(input: any): Promise<any> {
    console.info('RUN EXECUTOR (UpdateCrustStatusWorker). data: ', input);

    await runWithWorkers(input.data, 50, this.context, async (data, ctx) => {
      if (data.referenceId && data.referenceTable == DbTables.FILE) {
        const file: File = await new File({}, ctx).populateByUUID(
          data.referenceId,
        );

        try {
          if (file.exists()) {
            // success
            if (data.transactionStatus == 2) {
              file.fileStatus = FileStatus.PINNED_TO_CRUST;
              await file.update();
            } else {
              // error
              // TODO:
              await this.writeEventLog(
                {
                  logType: LogType.ERROR,
                  project_uuid: file.project_uuid,
                  message: 'Crust pin transaction FAILED',
                  service: ServiceName.STORAGE,
                  data: {
                    data,
                    file: file.serialize(),
                  },
                },
                LogOutput.SYS_ERROR,
              );
            }
          } else {
            await this.writeEventLog(
              {
                logType: LogType.WARN,
                message: 'No file matching reference found.',
                service: ServiceName.STORAGE,
                data: {
                  data,
                },
              },
              LogOutput.SYS_WARN,
            );
          }
        } catch (err) {
          await this.writeEventLog(
            {
              logType: LogType.ERROR,
              project_uuid: file.project_uuid,
              message: 'Error at updating status',
              service: ServiceName.STORAGE,
              data: {
                data,
                err,
              },
            },
            LogOutput.SYS_ERROR,
          );
          throw err;
        }
      } else {
        await this.writeEventLog(
          {
            logType: LogType.WARN,
            message: 'Got message without reference',
            service: ServiceName.STORAGE,
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

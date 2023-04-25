import { Context, env, Lmas, LogType, ServiceName } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { FileStatus } from '../config/types';
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

    for (let i = 0; i < input.data.length; i++) {
      const data = input.data[i];
      if (data.referenceId) {
        const file: File = await new File({}, this.context).populateByUUID(
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
              await new Lmas().writeLog({
                context: this.context,
                logType: LogType.ERROR,
                message: 'Crust pin transaction FAILED',
                location: `${this.constructor.name}/runExecutor`,
                service: ServiceName.STORAGE,
                data: {
                  data,
                  file: file.serialize(),
                },
              });
            }
          } else {
            console.log('No file to update');
            await new Lmas().writeLog({
              context: this.context,
              logType: LogType.WARN,
              message: 'No file matching reference found.',
              location: `${this.constructor.name}/runExecutor`,
              service: ServiceName.STORAGE,
              data: {
                data,
              },
            });
          }
        } catch (err) {
          console.log(env);
          await new Lmas().writeLog({
            context: this.context,
            logType: LogType.ERROR,
            message: 'Error at updating status',
            location: `${this.constructor.name}/runExecutor`,
            service: ServiceName.STORAGE,
            data: {
              data,
              err,
            },
          });
          throw err;
        }
      } else {
        await new Lmas().writeLog({
          context: this.context,
          logType: LogType.WARN,
          message: 'Got message without reference',
          location: `${this.constructor.name}/runExecutor`,
          service: ServiceName.STORAGE,
          data: {
            data,
          },
        });
      }
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `UpdateCrustStatusWorker worker has been completed!`,
    );

    return true;
  }
}

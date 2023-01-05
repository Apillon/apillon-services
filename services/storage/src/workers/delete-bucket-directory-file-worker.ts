import { AppEnvironment, Context, env, SqlModelStatus } from '@apillon/lib';
import { Job, ServerlessWorker, WorkerDefinition } from '@apillon/workers-lib';
import { DbTables } from '../config/types';
import { deleteBucket } from '../utils/delete-bucket';

export class DeleteBucketDirectoryFileWorker extends ServerlessWorker {
  private context: Context;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition);
    this.context = context;
  }

  public async before(data?: any): Promise<any> {
    // No used
  }
  public async execute(data?: any): Promise<any> {
    this.logFn(`DeleteBucketDirectoryFileWorker - execute BEGIN: ${data}`);

    //Get buckets that are marked for deletion more than 90 days (3 months)
    const bucketsToDelete = await this.context.mysql.paramExecute(
      `
      SELECT * 
      FROM \`${DbTables.BUCKET}\`
      WHERE status = ${SqlModelStatus.MARKED_FOR_DELETION} AND markedForDeletionTime < (NOW() - INTERVAL 90 DAY);
      `,
    );

    for (const bucket of bucketsToDelete) {
      await deleteBucket(this.context, bucket.id);
    }
  }

  public async onSuccess(_data?: any, _successData?: any): Promise<any> {
    // this.logFn(`ClearLogs - success: ${data} | ${successData} `);
  }

  public async onError(error: Error): Promise<any> {
    this.logFn(`DeleteBucketDirectoryFileWorker - error: ${error}`);
  }

  public async onUpdateWorkerDefinition(): Promise<void> {
    // this.logFn(`DeleteBucketDirectoryFileWorker - update definition: ${this.workerDefinition}`);
    if (
      env.APP_ENV != AppEnvironment.LOCAL_DEV &&
      env.APP_ENV != AppEnvironment.TEST
    )
      await new Job({}, this.context).updateWorkerDefinition(
        this.workerDefinition,
      );
    // this.logFn('DeleteBucketDirectoryFileWorker - update definition COMPLETE');
  }

  public onAutoRemove(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

import {
  AppEnvironment,
  Context,
  env,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
} from '@apillon/lib';
import { Job, ServerlessWorker, WorkerDefinition } from '@apillon/workers-lib';
import { DbTables } from '../config/types';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { deleteBucket } from '../lib/delete-bucket';
import { deleteDirectory } from '../lib/delete-directory';

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

    //Get buckets that are marked for deletion more than x days (3 months = default) and delete them
    const bucketsToDelete = await this.context.mysql.paramExecute(
      `
      SELECT * 
      FROM \`${DbTables.BUCKET}\`
      WHERE status = ${SqlModelStatus.MARKED_FOR_DELETION} 
      AND markedForDeletionTime < (NOW() - INTERVAL ${env.STORAGE_DELETE_AFTER_INTERVAL} DAY);
      `,
    );

    for (const bucket of bucketsToDelete) {
      const conn = await this.context.mysql.start();
      try {
        await deleteBucket(this.context, bucket.id, conn);
        await this.context.mysql.commit(conn);
        await new Lmas().writeLog({
          context: this.context,
          project_uuid: bucket.project_uuid,
          logType: LogType.INFO,
          message: 'Delete bucket success',
          location: 'DeleteBucketDirectoryFileWorker.execute',
          service: ServiceName.STORAGE,
          data: {
            bucket,
          },
        });
      } catch (err) {
        await this.context.mysql.rollback(conn);
        await new Lmas().writeLog({
          context: this.context,
          project_uuid: bucket.project_uuid,
          logType: LogType.ERROR,
          message: 'Delete bucket error',
          location: 'DeleteBucketDirectoryFileWorker.execute',
          service: ServiceName.STORAGE,
          data: {
            bucket,
            error: err,
          },
        });
      }
    }

    //Get directories that are marked for deletion more than x days (3 months = default) and delete them
    const directoriesToDelete = await this.context.mysql.paramExecute(
      `
      SELECT * 
      FROM \`${DbTables.DIRECTORY}\`
      WHERE status = ${SqlModelStatus.MARKED_FOR_DELETION} 
      AND markedForDeletionTime < (NOW() - INTERVAL ${env.STORAGE_DELETE_AFTER_INTERVAL} DAY);
      `,
    );

    for (const directory of directoriesToDelete) {
      const conn = await this.context.mysql.start();
      try {
        //Delete directory
        const delRes = await deleteDirectory(this.context, directory.id, conn);
        //Update bucket size
        const b: Bucket = await new Bucket({}, this.context).populateById(
          directory.bucket_id,
          conn,
        );
        b.size -= delRes.sizeOfDeletedFiles;
        await b.update(SerializeFor.UPDATE_DB, conn);
        await this.context.mysql.commit(conn);

        await new Lmas().writeLog({
          context: this.context,
          project_uuid: b.project_uuid,
          logType: LogType.INFO,
          message: 'Storage bucket size decreased',
          location: 'DeleteBucketDirectoryFileWorker.execute',
          service: ServiceName.STORAGE,
          data: {
            bucket_uuid: b.bucket_uuid,
            size: delRes.sizeOfDeletedFiles,
            bucketSize: b.size,
          },
        });
      } catch (err) {
        await this.context.mysql.rollback(conn);
        await new Lmas().writeLog({
          context: this.context,
          logType: LogType.ERROR,
          message: 'Delete directory error',
          location: 'DeleteBucketDirectoryFileWorker.execute',
          service: ServiceName.STORAGE,
          data: {
            directory,
            error: err,
          },
        });
      }
    }

    //Get files that are marked for deletion more than x days (3 months = default) and delete them
    const filesToDelete = await this.context.mysql.paramExecute(
      `
      SELECT * 
      FROM \`${DbTables.FILE}\`
      WHERE status = ${SqlModelStatus.MARKED_FOR_DELETION} 
      AND markedForDeletionTime < (NOW() - INTERVAL ${env.STORAGE_DELETE_AFTER_INTERVAL} DAY);
      `,
    );

    const decreasedSizeByBucket: any = {};
    for (const file of filesToDelete) {
      try {
        if (file.CID) await IPFSService.unpinFile(file.CID);
        //Increase size of files, that were deleted per bucket
        if (decreasedSizeByBucket[file.bucket_id]) {
          decreasedSizeByBucket[file.bucket_id] += file.size;
        } else decreasedSizeByBucket[file.bucket_id] = file.size;
      } catch (err) {
        await new Lmas().writeLog({
          context: this.context,
          logType: LogType.ERROR,
          message: 'Unpin file error',
          location: 'DeleteBucketDirectoryFileWorker.execute',
          service: ServiceName.STORAGE,
          data: {
            file,
            error: err,
          },
        });
      }
    }
    //Mark files as deleted
    await this.context.mysql.paramExecute(
      `
      UPDATE \`${DbTables.FILE}\`
      SET status = ${SqlModelStatus.DELETED}
      WHERE status = ${SqlModelStatus.MARKED_FOR_DELETION} 
      AND markedForDeletionTime < (NOW() - INTERVAL ${env.STORAGE_DELETE_AFTER_INTERVAL} DAY);
      `,
    );
    //Decrease buckets size
    for (const bucket_id in decreasedSizeByBucket) {
      const b: Bucket = await new Bucket({}, this.context).populateById(
        +bucket_id,
      );
      b.size -= decreasedSizeByBucket[bucket_id];
      await b.update();

      await new Lmas().writeLog({
        context: this.context,
        project_uuid: b.project_uuid,
        logType: LogType.INFO,
        message: 'Storage bucket size decreased',
        location: 'DeleteBucketDirectoryFileWorker.execute',
        service: ServiceName.STORAGE,
        data: {
          bucket_uuid: b.bucket_uuid,
          size: decreasedSizeByBucket[bucket_id],
          bucketSize: b.size,
        },
      });
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

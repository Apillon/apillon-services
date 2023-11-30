import {
  AppEnvironment,
  CodeException,
  Context,
  env,
  runWithWorkers,
  ServiceName,
  splitArray,
  SqlModelStatus,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { DbTables, StorageErrorCode } from '../config/types';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { ProjectConfig } from '../modules/config/models/project-config.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { uniq } from 'lodash';

/**
 * If project cancels or downgrades it's subscription, it is possible that it uses more resources than it's available in current subscription.
 * This worker acquires files (createTime ASC - older first), which are then deleted from bucket and unpinned from IPFS nodes.
 * Worker deletes as many files as it needs, so that project doesn't uses more resources than available.
 */
export class FreeProjectResourcesWorker extends BaseQueueWorker {
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
    project_uuid: string;
    maxStorageQuota: number;
  }): Promise<any> {
    console.info('RUN EXECUTOR (FreeProjectResourceWorker). data: ', input);

    //Free project used storage
    const usedStorage = await new Bucket(
      { project_uuid: input.project_uuid },
      this.context,
    ).getTotalSizeUsedByProject();

    if (usedStorage > input.maxStorageQuota) {
      const overQuotaStorage = usedStorage - input.maxStorageQuota;

      const files = await this.context.mysql.paramExecute(
        `
        SELECT f.* FROM \`${DbTables.FILE}\` f
        WHERE f.project_uuid = @project_uuid
        AND f.status = ${SqlModelStatus.ACTIVE}
        ORDER BY f.createTime ASC
      `,
        { project_uuid: input.project_uuid },
      );

      //Get files that will be removed
      const filesToRemove = [];
      let sizeOfFilesToRemove = 0;
      while (sizeOfFilesToRemove < overQuotaStorage && files.length) {
        sizeOfFilesToRemove += files[0].size;
        filesToRemove.push(files.shift());
      }

      //Get ipfs cluster
      const ipfsCluster = await new ProjectConfig(
        { project_uuid: input.project_uuid },
        this.context,
      ).getIpfsCluster();

      await runWithWorkers(
        splitArray(filesToRemove, 50),
        env.APP_ENV == AppEnvironment.LOCAL_DEV ||
          env.APP_ENV == AppEnvironment.TEST
          ? 1
          : 5,
        this.context,
        async (files: any[], ctx: ServiceContext) => {
          const conn = await ctx.mysql.start();

          try {
            //Mark files deleted
            await this.context.mysql.paramExecute(
              `
              UPDATE \`${DbTables.FILE}\`
              SET status = ${SqlModelStatus.DELETED}
              WHERE id in (${files.map((x) => x.id).join(',')})
            `,
              {},
              conn,
            );
            //Decrease size of buckets
            const bucketsIds = uniq(files.map((x) => x.bucket_id));

            console.info(
              'Size of files: ',
              files
                .filter((x) => x.bucket_id == 1)
                .reduce((a, b) => a + b.size, 0),
            );
            bucketsIds.forEach(async (bucketId) => {
              await this.context.mysql.paramExecute(
                `
                UPDATE \`${DbTables.BUCKET}\`
                SET size = size - @size
                WHERE id = @id
              `,
                {
                  size: files
                    .filter((x) => x.bucket_id == bucketId)
                    .reduce((a, b) => a + b.size, 0),
                  id: bucketId,
                },
                conn,
              );
            });

            //Unpin files from ipfs
            const ipfsService = new IPFSService(ctx, input.project_uuid);
            await ipfsService.initializeIPFSClient();
            await Promise.all(
              files
                .filter((x) => x.CID)
                .map((file) =>
                  ipfsService.unpinCidFromCluster(file.CID, ipfsCluster),
                ),
            );

            await this.context.mysql.commit(conn);
          } catch (err) {
            await ctx.mysql.rollback(conn);

            await new CodeException({
              code: StorageErrorCode.FREE_PROJECT_RESOURCES_WORKER_UNHANDLED_EXCEPTION,
              status: 500,
              context: this.context,
              errorCodes: StorageErrorCode,
              errorMessage:
                'FreeProjectResourceWorker error at delete and unpin files ',
              details: err,
              sourceFunction: 'FreeProjectResourceWorker.runExecutor',
              sourceModule: ServiceName.STORAGE,
            }).writeToMonitor({
              sendAdminAlert: true,
              project_uuid: input.project_uuid,
            });
          }
        },
      );
    }

    return true;
  }
}

import {
  Context,
  env,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  writeLog,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { v4 as uuidV4 } from 'uuid';
import {
  DeploymentEnvironment,
  DeploymentStatus,
  FileStatus,
  StorageErrorCode,
} from '../config/types';
import { StorageCodeException } from '../lib/exceptions';
import { generateDirectoriesFromPath } from '../lib/generate-directories-from-path';
import { pinFileToCRUST } from '../lib/pin-file-to-crust';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { Directory } from '../modules/directory/models/directory.model';
import { Deployment } from '../modules/hosting/models/deployment.model';
import { WebPage } from '../modules/hosting/models/web-page.model';
import { uploadFilesToIPFSRes } from '../modules/ipfs/interfaces/upload-files-to-ipfs-res.interface';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { File } from '../modules/storage/models/file.model';

export class DeployWebPageWorker extends BaseQueueWorker {
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
  public async runExecutor(data: any): Promise<any> {
    console.info('RUN EXECUTOR (DeployWebPageWorker). data: ', data);

    const deployment = await new Deployment({}, this.context).populateById(
      data?.deployment_id,
    );
    if (!deployment.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.INVALID_PARAMETERS_FOR_DEPLOYMENT_WORKER,
        status: 500,
        context: this.context,
        details: data,
      });
    }

    //Update deployment - in progress
    deployment.deploymentStatus = DeploymentStatus.IN_PROGRESS;
    await deployment.update();

    try {
      const webPage: WebPage = await new WebPage({}, this.context).populateById(
        deployment.webPage_id,
      );
      //according to environment, select source and target bucket
      const sourceBucket_id =
        deployment.environment == DeploymentEnvironment.STAGING
          ? webPage.bucket_id
          : webPage.stagingBucket_id;
      const targetBucket_id =
        deployment.environment == DeploymentEnvironment.STAGING
          ? webPage.stagingBucket_id
          : webPage.productionBucket_id;

      const sourceBucket: Bucket = await new Bucket(
        {},
        this.context,
      ).populateById(sourceBucket_id);

      const targetBucket: Bucket = await new Bucket(
        {},
        this.context,
      ).populateById(targetBucket_id);

      //get directories in source bucket
      const sourceDirectories = await new Directory(
        {},
        this.context,
      ).populateDirectoriesInBucket(sourceBucket_id, this.context);
      for (const srcDir of sourceDirectories) {
        await srcDir.populateFullPath(sourceDirectories);
      }

      //get files in source bucket
      const sourceFiles: File[] = await new File(
        {},
        this.context,
      ).populateFilesInBucket(sourceBucket_id, this.context);
      for (const srcFile of sourceFiles) {
        srcFile.populatePath(sourceDirectories);
      }

      //Add files to IPFS
      let ipfsRes: uploadFilesToIPFSRes = undefined;
      let cidSize: number = undefined;
      if (deployment.environment == DeploymentEnvironment.STAGING) {
        ipfsRes = await IPFSService.uploadFilesToIPFSFromS3({
          files: sourceFiles,
          wrapWithDirectory: true,
        });

        targetBucket.CID = ipfsRes.parentDirCID.toV0().toString();

        //Update bucket CID & Size
        targetBucket.size += ipfsRes.size;
        targetBucket.uploadedSize += ipfsRes.size;

        deployment.size = ipfsRes.size;
        cidSize = ipfsRes.size;
      } else if (deployment.environment == DeploymentEnvironment.PRODUCTION) {
        //Update bucket CID & size
        targetBucket.CID = sourceBucket.CID;

        //Get CID size
        //Find deployment from preview to staging, to find CID size
        const stagingDeployment = await new Deployment(
          {},
          this.context,
        ).populateDeploymentByCid(targetBucket.CID);
        if (stagingDeployment.exists() && stagingDeployment.size) {
          targetBucket.size += stagingDeployment.size;
          targetBucket.uploadedSize += stagingDeployment.size;
          cidSize = stagingDeployment.size;
        }
      }
      //publish IPNS and update target bucket
      const ipns = await IPFSService.publishToIPNS(
        targetBucket.CID,
        targetBucket.bucket_uuid,
      );
      targetBucket.IPNS = ipns.name;
      const conn = await this.context.mysql.start();

      try {
        await targetBucket.update(SerializeFor.UPDATE_DB, conn);

        //copy files to new bucket
        await targetBucket.clearBucketContent(this.context, conn);

        const directories: Directory[] = [];
        for (const srcFile of sourceFiles) {
          srcFile.populatePath(sourceDirectories);

          const fileDirectory = await generateDirectoriesFromPath(
            this.context,
            directories,
            srcFile.path,
            targetBucket,
            ipfsRes?.ipfsDirectories,
            conn,
          );

          await new File({}, this.context)
            .populate({
              file_uuid: uuidV4(),
              CID: srcFile.CID,
              s3FileKey: srcFile.s3FileKey,
              name: srcFile.name,
              contentType: srcFile.contentType,
              project_uuid: targetBucket.project_uuid,
              bucket_id: targetBucket_id,
              directory_id: fileDirectory?.id,
              size: srcFile.size,
              fileStatus: FileStatus.UPLOADED_TO_IPFS,
            })
            .insert(SerializeFor.INSERT_DB, conn);
        }

        if (deployment.environment == DeploymentEnvironment.PRODUCTION) {
          //populate full paths of directories, compare them to source directories to get directory CID
          for (const dir of directories) {
            await dir.populateFullPath(directories);
            const sourceDirectory = sourceDirectories.find(
              (x) => x.fullPath == dir.fullPath,
            );

            if (sourceDirectory) {
              dir.CID = sourceDirectory.CID;
              await dir.update(SerializeFor.UPDATE_DB, conn);
            }
          }

          //pin CID to CRUST
          await pinFileToCRUST(
            this.context,
            targetBucket.bucket_uuid,
            targetBucket.CID,
            cidSize,
          );
        }

        //Update deployment - finished
        deployment.deploymentStatus = DeploymentStatus.SUCCESSFUL;
        deployment.cid = targetBucket.CID;
        await deployment.update(SerializeFor.UPDATE_DB, conn);

        await this.context.mysql.commit(conn);
      } catch (err) {
        await this.context.mysql.rollback(conn);
        throw err;
      }

      await new Lmas().writeLog({
        context: this.context,
        project_uuid: targetBucket.project_uuid,
        logType: LogType.INFO,
        message: 'Web page deploy - success',
        location: `${this.constructor.name}/runExecutor`,
        service: ServiceName.STORAGE,
        data: {
          deployment: deployment,
          data: data,
        },
      });
    } catch (err) {
      await new Lmas().writeLog({
        context: this.context,
        logType: LogType.INFO,
        message: 'Web page deploy - failed',
        location: `${this.constructor.name}/runExecutor`,
        service: ServiceName.STORAGE,
        data: {
          deployment: deployment,
          data: data,
          error: err,
        },
      });

      try {
        deployment.deploymentStatus = DeploymentStatus.FAILED;
        await deployment.update();
      } catch (upgError) {
        writeLog(
          LogType.ERROR,
          'Error updating deploymentStatus status to DeploymentStatus.FAILED',
          'deploy-web-page-worker.ts',
          'DeployWebPageWorker.runExecutor',
          upgError,
        );
      }
    }
  }
}

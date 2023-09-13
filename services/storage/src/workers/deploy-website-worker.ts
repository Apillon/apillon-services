import { Context, env, LogType, SerializeFor, ServiceName } from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { v4 as uuidV4 } from 'uuid';
import {
  DbTables,
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
import { HostingService } from '../modules/hosting/hosting.service';
import { Deployment } from '../modules/hosting/models/deployment.model';
import { Website } from '../modules/hosting/models/website.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { File } from '../modules/storage/models/file.model';
import { CID } from 'ipfs-http-client';
import { uploadItemsToIPFSRes } from '../modules/ipfs/interfaces/upload-items-to-ipfs-res.interface';
import { Ipns } from '../modules/ipns/models/ipns.model';

export class DeployWebsiteWorker extends BaseQueueWorker {
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
    // console.info('RUN EXECUTOR (DeployWebsiteWorker). data: ', data);

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

    const website: Website = await new Website({}, this.context).populateById(
      deployment.website_id,
    );

    try {
      //according to environment, select source and target bucket
      const sourceBucket_id =
        deployment.environment == DeploymentEnvironment.STAGING ||
        deployment.environment == DeploymentEnvironment.DIRECT_TO_PRODUCTION
          ? website.bucket_id
          : website.stagingBucket_id;

      const targetBucket_id =
        deployment.environment == DeploymentEnvironment.STAGING
          ? website.stagingBucket_id
          : website.productionBucket_id;

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
      let ipfsRes: uploadItemsToIPFSRes = undefined;
      let cidSize: number = undefined;
      if (
        deployment.environment == DeploymentEnvironment.STAGING ||
        deployment.environment == DeploymentEnvironment.DIRECT_TO_PRODUCTION
      ) {
        ipfsRes = await IPFSService.uploadFilesToIPFSFromS3(
          {
            files: sourceFiles,
            wrapWithDirectory: true,
            wrappingDirectoryPath: `Deployment_${deployment.id}`,
            project_uuid: website.project_uuid,
          },
          this.context,
        );

        targetBucket.CID = ipfsRes.parentDirCID.toV0().toString();
        targetBucket.CIDv1 = ipfsRes.parentDirCID.toV1().toString();

        //Update bucket CID & Size
        targetBucket.size += ipfsRes.size;
        targetBucket.uploadedSize += ipfsRes.size;

        deployment.size = ipfsRes.size;
        cidSize = ipfsRes.size;
      } else if (deployment.environment == DeploymentEnvironment.PRODUCTION) {
        //Update bucket CID & size
        targetBucket.CID = sourceBucket.CID;
        targetBucket.CIDv1 = sourceBucket.CIDv1;

        //Get CID size
        //Find deployment from preview to staging, to find CID size
        const stagingDeployment = await new Deployment(
          {},
          this.context,
        ).populateDeploymentByCid(targetBucket.CID);
        if (stagingDeployment.exists() && stagingDeployment.size) {
          targetBucket.size += stagingDeployment.size;
          targetBucket.uploadedSize += stagingDeployment.size;
          deployment.size = stagingDeployment.size;
          cidSize = stagingDeployment.size;
        }
      }
      //publish IPNS and update target bucket
      const ipns = await IPFSService.publishToIPNS(
        targetBucket.CID,
        targetBucket.bucket_uuid,
      );
      targetBucket.IPNS = ipns.name;

      //create ipns record if it doesn't exists yet
      const ipnsDbRecord: Ipns = await new Ipns({}, this.context).populateByKey(
        targetBucket.bucket_uuid,
      );
      if (!ipnsDbRecord.exists()) {
        ipnsDbRecord.populate({
          project_uuid: targetBucket.project_uuid,
          bucket_id: targetBucket.id,
          name: targetBucket.name + ' IPNS',
          ipnsName: ipns.name,
          ipnsValue: ipns.value,
          key: targetBucket.bucket_uuid,
          cid: targetBucket.CID,
        });

        await ipnsDbRecord.insert();
      }

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
              CIDv1: srcFile.CIDv1,
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
              dir.CIDv1 = sourceDirectory.CIDv1;
              await dir.update(SerializeFor.UPDATE_DB, conn);
            }
          }
        }

        if (
          deployment.environment == DeploymentEnvironment.PRODUCTION ||
          deployment.environment == DeploymentEnvironment.DIRECT_TO_PRODUCTION
        ) {
          //pin CID to CRUST
          await pinFileToCRUST(
            this.context,
            targetBucket.bucket_uuid,
            CID.parse(targetBucket.CID),
            cidSize,
            true,
            targetBucket.bucket_uuid,
            DbTables.BUCKET,
          );
        }

        //Update deployment - finished
        deployment.deploymentStatus = DeploymentStatus.SUCCESSFUL;
        deployment.cid = targetBucket.CID;
        deployment.cidv1 = targetBucket.CIDv1;
        await deployment.update(SerializeFor.UPDATE_DB, conn);

        await this.context.mysql.commit(conn);
        //Clear bucket for upload
        try {
          if (
            (deployment.environment == DeploymentEnvironment.STAGING ||
              deployment.environment ==
                DeploymentEnvironment.DIRECT_TO_PRODUCTION) &&
            data.clearBucketForUpload
          ) {
            await HostingService.clearBucketContent(
              { bucket: sourceBucket },
              this.context,
            );
          }
        } catch (err) {}
      } catch (err) {
        await this.context.mysql.rollback(conn);
        throw err;
      }

      await this.writeEventLog({
        logType: LogType.INFO,
        project_uuid: website.project_uuid,
        message: 'Web page deploy - success',
        service: ServiceName.STORAGE,
        data: {
          project_uuid: targetBucket.project_uuid,
          deployment,
          data,
        },
      });
    } catch (err) {
      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          project_uuid: website.project_uuid,
          message: 'Web page deploy - failed',
          service: ServiceName.STORAGE,
          data: {
            deployment,
            data,
            error: err,
          },
        },
        LogOutput.SYS_ERROR,
      );

      try {
        deployment.deploymentStatus = DeploymentStatus.FAILED;
        await deployment.update();
      } catch (upgError) {
        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            project_uuid: website.project_uuid,
            message:
              'Error updating deploymentStatus status to DeploymentStatus.FAILED',
            service: ServiceName.STORAGE,
            err: upgError,
          },
          LogOutput.SYS_ERROR,
        );
      }
    }
  }
}

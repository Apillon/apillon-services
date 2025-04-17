import {
  AppEnvironment,
  checkProjectSubscription,
  Context,
  env,
  LogType,
  refundCredit,
  SerializeFor,
  ServiceName,
} from '@apillon/lib';
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
} from '../config/types';
import { createCloudfrontInvalidationCommand } from '../lib/aws-cloudfront';
import { generateDirectoriesFromPath } from '../lib/generate-directories-from-path';
import { pinFileToCRUST } from '../lib/pin-file-to-crust';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { Directory } from '../modules/directory/models/directory.model';
import { HostingService } from '../modules/hosting/hosting.service';
import { Deployment } from '../modules/hosting/models/deployment.model';
import { Website } from '../modules/hosting/models/website.model';
import { uploadItemsToIPFSRes } from '../modules/ipfs/interfaces/upload-items-to-ipfs-res.interface';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { Ipns } from '../modules/ipns/models/ipns.model';
import { File } from '../modules/storage/models/file.model';

/**
 * Worker uploads files from source bucket to IPFS, acquired CID is published to website ipns record.
 * Files from source bucket are copied to target bucket, so that user can see what is published in specific environment.
 * Deployment and website are updated based on executed steps.
 * If project doesn't have subscription package, deployment is first sent to review.
 */
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
    console.info('RUN EXECUTOR (DeployWebsiteWorker). data: ', data);

    const deployment = await new Deployment({}, this.context).populateByUUID(
      data?.deployment_uuid,
      'deployment_uuid',
    );
    if (!deployment.exists()) {
      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message: 'Invalid parameters for deployment worker',
          service: ServiceName.STORAGE,
          data: {
            data,
          },
        },
        LogOutput.SYS_ERROR,
      );
      return;
    }

    const deploymentReviewed =
      deployment.deploymentStatus == DeploymentStatus.APPROVED;

    //Update deployment - in progress
    deployment.deploymentStatus = DeploymentStatus.IN_PROGRESS;
    await deployment.update();

    const website: Website = await new Website({}, this.context).populateById(
      deployment.website_id,
    );

    const ipfsService = new IPFSService(this.context, website.project_uuid);

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

      //Add files to IPFS
      let ipfsRes: uploadItemsToIPFSRes = undefined;
      let cidSize: number = undefined;
      if (
        deployment.environment == DeploymentEnvironment.STAGING ||
        deployment.environment == DeploymentEnvironment.DIRECT_TO_PRODUCTION
      ) {
        ipfsRes = await ipfsService.uploadFilesToIPFSFromS3(
          {
            files: sourceFiles,
            wrappingDirectoryPath: `Deployment_${deployment.id}`,
          },
          this.context,
        );

        //Set ipfsRes data to deployment
        deployment.cid = ipfsRes.parentDirCID;
        deployment.cidv1 = ipfsRes.parentDirCID;
        deployment.size = ipfsRes.size;

        //If deployment was not already reviewed, and env variable for sending websites to review is set to 1
        if (
          !deploymentReviewed &&
          !website.nftCollectionUuid &&
          env.SEND_WEBSITES_TO_REVIEW &&
          !(await checkProjectSubscription(this.context, website.project_uuid))
        ) {
          //Check if deployment with such CID(content) already exists. Skip review if true
          const reviewedDeployment = await new Deployment(
            {},
            this.context,
          ).populateDeploymentByCid(deployment.cid);

          if (!reviewedDeployment.exists()) {
            //if project is on freemium, website goes to review
            await deployment.sendToReview(website, data.user_uuid);
            return;
          }
        }

        targetBucket.CID = ipfsRes.parentDirCID;
        targetBucket.CIDv1 = ipfsRes.parentDirCID;

        //Update bucket CID & Size
        targetBucket.size = ipfsRes.size;
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
          targetBucket.size = stagingDeployment.size;
          targetBucket.uploadedSize += stagingDeployment.size;
          deployment.size = stagingDeployment.size;
          cidSize = stagingDeployment.size;
        }
      }

      if (targetBucket.IPNS) {
        //publish IPNS and update target bucket
        const ipns = await ipfsService.publishToIPNS(
          targetBucket.CID,
          targetBucket.bucket_uuid,
        );
        targetBucket.IPNS = ipns.name;

        //create ipns record if it doesn't exists yet. When IPNS became payable, it should exists. But will keep this for backward compatibility
        const ipnsDbRecord: Ipns = await new Ipns(
          {},
          this.context,
        ).populateByKey(targetBucket.bucket_uuid);
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
        } else {
          //Update db ipns record with new values
          ipnsDbRecord.populate({
            ipnsValue: ipns.value,
            key: targetBucket.bucket_uuid,
            cid: targetBucket.CID,
          });

          await ipnsDbRecord.update();
        }
      }

      const conn = await this.context.mysql.start();

      try {
        //copy files to new bucket
        await targetBucket.clearBucketContent(this.context, conn, false);

        const directories: Directory[] = [];
        for (const srcFile of sourceFiles) {
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
              path: srcFile.path,
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
            targetBucket.CID,
            cidSize,
            true,
            targetBucket.bucket_uuid,
            DbTables.BUCKET,
          );

          //Invalidate cache if cdnId is set for this website
          await createCloudfrontInvalidationCommand(this.context, website);
        }

        //Update deployment - finished
        deployment.deploymentStatus = DeploymentStatus.SUCCESSFUL;
        deployment.cid = targetBucket.CID;
        deployment.cidv1 = targetBucket.CIDv1;
        await deployment.update(SerializeFor.UPDATE_DB, conn);
        await targetBucket.update(SerializeFor.UPDATE_DB, conn);

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
          deployment: deployment.serialize(),
          data,
        },
      });
    } catch (err) {
      console.error(err);
      //To prevent failure of website deployment, try multiple times (possible problems with IPFS or some other service).
      if (deployment.retryCount < 3) {
        deployment.retryCount += 1;
        await deployment.update().catch(async (upgError) => {
          await this.writeEventLog(
            {
              logType: LogType.ERROR,
              project_uuid: website.project_uuid,
              message: 'Error updating deployment retryCount',
              service: ServiceName.STORAGE,
              err: upgError,
            },
            LogOutput.SYS_ERROR,
          );
        });
        //Error is thrown from worker, so this sqs message will be processed again
        throw err;
      }

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

      deployment.deploymentStatus = DeploymentStatus.FAILED;
      await deployment.update().catch(async (upgError) => {
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
      });

      //deployment failed - refund credit
      await refundCredit(
        this.context,
        DbTables.DEPLOYMENT,
        data?.deployment_uuid,
        'DeployWebsiteWorker.runExecutor',
        ServiceName.STORAGE,
      );

      if (
        env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
      ) {
        //Throw error so that e2e test and local testing will fail if deploy failed
        throw err;
      }
    }
  }
}

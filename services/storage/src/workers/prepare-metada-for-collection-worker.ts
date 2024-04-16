import {
  AppEnvironment,
  AWS_S3,
  Context,
  env,
  LogType,
  NftsMicroservice,
  runWithWorkers,
  SerializeFor,
  ServiceName,
  streamToString,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  sendToWorkerQueue,
  WorkerDefinition,
} from '@apillon/workers-lib';
import {
  BucketType,
  FileUploadRequestFileStatus,
  FileUploadSessionStatus,
  PrepareCollectionMetadataSteps,
} from '../config/types';
import { storageBucketSyncFilesToIPFS } from '../lib/storage-bucket-sync-files-to-ipfs';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { ProjectConfig } from '../modules/config/models/project-config.model';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import { Ipns } from '../modules/ipns/models/ipns.model';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';
import { File } from '../modules/storage/models/file.model';
import { WorkerName } from './worker-executor';
import { CollectionMetadata } from '../modules/nfts/modules/collection-metadata.model';

export class PrepareMetadataForCollectionWorker extends BaseQueueWorker {
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
    console.info(
      'RUN EXECUTOR (PrepareMetadataForCollectionWorker). data: ',
      data,
    );

    const collectionMetadata = await new CollectionMetadata(
      {},
      this.context,
    ).populateById(data.collectionMetadataId);

    //S3 client
    const s3Client: AWS_S3 = new AWS_S3();

    //bucket
    const bucket = await new Bucket({}, this.context).populateByUUID(
      collectionMetadata.bucket_uuid,
    );

    try {
      //Load data, execute validations, upload images --> STEP 1
      if (
        !collectionMetadata.currentStep ||
        collectionMetadata.currentStep ==
          PrepareCollectionMetadataSteps.UPLOAD_IMAGES_TO_IPFS
      ) {
        //Get sessions
        const imagesSession = await new FileUploadSession(
          {},
          this.context,
        ).populateByUUID(collectionMetadata.imagesSession);

        //Get files in session (fileStatus must be of status 1)
        const imageFURs = await new FileUploadRequest(
          {},
          this.context,
        ).populateFileUploadRequestsInSession(imagesSession.id, this.context);

        /*Upload nft images to IPFS. If remaining files to upload exceeds DEFAULT_FILE_BATCH_SIZE_FOR_IPFS, 
      worker uploads first batch and sends message to sqs to execute another iteration, until all images are uploaded */
        const remainingImageFURs = imageFURs.filter(
          (x) => x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED,
        );
        await storageBucketSyncFilesToIPFS(
          this.context,
          `${this.constructor.name}/runExecutor`,
          bucket,
          remainingImageFURs.slice(0, env.STORAGE_MAX_FILE_BATCH_SIZE_FOR_IPFS),
          false,
          undefined,
        );

        if (
          remainingImageFURs.length < env.STORAGE_MAX_FILE_BATCH_SIZE_FOR_IPFS
        ) {
          imagesSession.sessionStatus = FileUploadSessionStatus.FINISHED;
          await imagesSession.update();

          collectionMetadata.currentStep =
            PrepareCollectionMetadataSteps.UPDATE_JSONS_ON_S3;
          collectionMetadata.update();
        }

        if (
          env.APP_ENV != AppEnvironment.TEST &&
          env.APP_ENV != AppEnvironment.LOCAL_DEV
        ) {
          //send message to sqs to perform another upload iteration or to proceed to next step
          await sendToWorkerQueue(
            env.STORAGE_AWS_WORKER_SQS_URL,
            WorkerName.PREPARE_METADATA_FOR_COLLECTION_WORKER,
            [
              {
                collectionMetadataId: collectionMetadata.id,
              },
            ],
            null,
            null,
          );
        }
        return true;
      }

      //Prepare NFT metadata - STEP 2
      if (
        collectionMetadata.currentStep ==
        PrepareCollectionMetadataSteps.UPDATE_JSONS_ON_S3
      ) {
        //Download each metadata file from s3, update image property and upload back to s3

        const imagesInBucket = await new File(
          {},
          this.context,
        ).populateFilesInBucket(bucket.id, this.context);

        const metadataSession = await new FileUploadSession(
          {},
          this.context,
        ).populateByUUID(collectionMetadata.metadataSession);

        //Get files in session (fileStatus must be of status 1)
        const metadataFURs = (
          await new FileUploadRequest(
            {},
            this.context,
          ).populateFileUploadRequestsInSession(
            metadataSession.id,
            this.context,
          )
        ).filter(
          (x) => x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED,
        );

        console.info(
          'metadataFURs acquired. Starting modification of json files on s3.',
          metadataFURs.map((x) => x.serialize()),
        );

        //Get IPFS cluster
        const ipfsCluster = await new ProjectConfig(
          { project_uuid: bucket.project_uuid },
          this.context,
        ).getIpfsCluster();

        await runWithWorkers(
          metadataFURs,
          20,
          this.context,
          async (metadataFUR) => {
            if (
              !(await s3Client.exists(
                env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
                metadataFUR.s3FileKey,
              ))
            ) {
              //NOTE: Define flow, what happen in this case. My guess - we should probably throw error
              return;
            }
            const file = await s3Client.get(
              env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
              metadataFUR.s3FileKey,
            );

            const fileContent = JSON.parse(
              await streamToString(file.Body, 'utf-8'),
            );
            if (fileContent.image) {
              const imageFile = imagesInBucket.find(
                (x) => x.name == fileContent.image,
              );

              if (collectionMetadata.useApillonIpfsGateway) {
                fileContent.image = ipfsCluster.generateLink(
                  bucket.project_uuid,
                  imageFile.CIDv1,
                );
              } else {
                fileContent.image = 'ipfs://' + imageFile.CID;
              }
            }

            await s3Client.upload(
              env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
              metadataFUR.s3FileKey,
              Buffer.from(JSON.stringify(fileContent), 'utf-8'),
              'application/json',
            );
          },
        );

        console.info(
          'Collection metadata successfully prepared on s3. Updating collection metadata and sending message to sqs. ',
        );

        collectionMetadata.currentStep =
          PrepareCollectionMetadataSteps.UPLOAD_METADATA_TO_IPFS;
        await collectionMetadata.update();

        if (
          env.APP_ENV != AppEnvironment.TEST &&
          env.APP_ENV != AppEnvironment.LOCAL_DEV
        ) {
          await sendToWorkerQueue(
            env.STORAGE_AWS_WORKER_SQS_URL,
            WorkerName.PREPARE_METADATA_FOR_COLLECTION_WORKER,
            [
              {
                collectionMetadataId: collectionMetadata.id,
              },
            ],
            null,
            null,
          );
        }
        return true;
      }

      //Sync metadata to IPFS --> STEP 3
      if (
        collectionMetadata.currentStep ==
        PrepareCollectionMetadataSteps.UPLOAD_METADATA_TO_IPFS
      ) {
        const metadataSession = await new FileUploadSession(
          {},
          this.context,
        ).populateByUUID(collectionMetadata.metadataSession);

        const metadataFURs = (
          await new FileUploadRequest(
            {},
            this.context,
          ).populateFileUploadRequestsInSession(
            metadataSession.id,
            this.context,
          )
        ).filter(
          (x) => x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED,
        );

        const metadataFiles = await storageBucketSyncFilesToIPFS(
          this.context,
          `${this.constructor.name}/runExecutor`,
          bucket,
          metadataFURs.slice(0, env.STORAGE_MAX_FILE_BATCH_SIZE_FOR_IPFS),
          true,
          'Metadata',
        );

        if (metadataFURs.length >= env.STORAGE_MAX_FILE_BATCH_SIZE_FOR_IPFS) {
          await sendToWorkerQueue(
            env.STORAGE_AWS_WORKER_SQS_URL,
            WorkerName.PREPARE_METADATA_FOR_COLLECTION_WORKER,
            [
              {
                collectionMetadataId: collectionMetadata.id,
              },
            ],
            null,
            null,
          );

          return true;
        } else {
          metadataSession.sessionStatus = FileUploadSessionStatus.FINISHED;
          await metadataSession.update();
        }

        //Publish to IPNS, Pin to IPFS, Remove from S3, ...

        console.info(
          `pinning metadata CID (${metadataFiles.wrappedDirCid}) to IPNS`,
        );

        if (collectionMetadata.useApillonIpfsGateway) {
          //If ipnsId is not specified in data, get first ipns record in bucket
          if (!data.ipnsId) {
            const ipnses = await bucket.getBucketIpnsRecords();
            data.ipnsId = ipnses[0].id;
          }
          //Pin to IPNS
          const ipnsDbRecord: Ipns = await new Ipns(
            {},
            this.context,
          ).populateById(data.ipnsId);
          const ipnsRecord = await new IPFSService(
            this.context,
            ipnsDbRecord.project_uuid,
          ).publishToIPNS(
            metadataFiles.wrappedDirCid,
            `${ipnsDbRecord.project_uuid}_${ipnsDbRecord.bucket_id}_${ipnsDbRecord.id}`,
          );
          ipnsDbRecord.ipnsValue = ipnsRecord.value;
          ipnsDbRecord.key = `${ipnsDbRecord.project_uuid}_${ipnsDbRecord.bucket_id}_${ipnsDbRecord.id}`;
          ipnsDbRecord.cid = metadataFiles.wrappedDirCid;
          await ipnsDbRecord.update(SerializeFor.UPDATE_DB);
        } else {
          //Metadata is prepared. It won't use apillon gateway ipns as base uri, so run nft deploy with wrapping cid as base URI
          if (
            env.APP_ENV == AppEnvironment.LOCAL_DEV ||
            env.APP_ENV == AppEnvironment.TEST
          ) {
            await new NftsMicroservice(
              this.context,
            ).executeDeployCollectionWorker({
              collection_uuid: data.collection_uuid,
              baseUri: 'ipfs://' + metadataFiles.wrappedDirCid,
            });
          } else {
            await sendToWorkerQueue(
              env.NFTS_AWS_WORKER_SQS_URL,
              'DeployCollectionWorker',
              [
                {
                  collection_uuid: data.collection_uuid,
                  baseUri: 'ipfs://' + metadataFiles.wrappedDirCid,
                },
              ],
              null,
              null,
            );
          }
        }

        //Remove all files of this bucket in S3
        await s3Client.removeDirectory(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          `${BucketType[bucket.bucketType]}_sessions/${bucket.id}`,
        );

        collectionMetadata.currentStep =
          PrepareCollectionMetadataSteps.METADATA_SUCCESSFULLY_PREPARED;
        await collectionMetadata.update();

        await this.writeEventLog({
          logType: LogType.INFO,
          project_uuid: bucket.project_uuid,
          message: 'PrepareMetadataForCollectionWorker finished!',
          service: ServiceName.STORAGE,
          data: {
            data,
          },
        });
      }
    } catch (error) {
      console.error(error);
      collectionMetadata.lastError = `Error message: ${error.message}. ${JSON.stringify(error)}`;
      await collectionMetadata.update().catch((upgError) => {
        console.error(
          'Error updating collection metadata last error field. ',
          upgError,
        );
      });

      throw error;
    }

    return true;
  }
}

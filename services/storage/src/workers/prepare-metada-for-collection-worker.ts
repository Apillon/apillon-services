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
  LogOutput,
  QueueWorkerType,
  sendToWorkerQueue,
  WorkerDefinition,
} from '@apillon/workers-lib';
import {
  BucketType,
  FileUploadRequestFileStatus,
  FileUploadSessionStatus,
  PrepareCollectionMetadataStep,
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

    let collectionMetadata;

    if (data.collectionMetadataId) {
      collectionMetadata = await new CollectionMetadata(
        {},
        this.context,
      ).populateById(data.collectionMetadataId);
    } else if (data.collection_uuid) {
      //Sqs message from nft microservice (add nft metadata). collectionMetadata record doesn't exists yet - create new one.
      collectionMetadata = await new CollectionMetadata(
        {
          ...data,
          currentStep: PrepareCollectionMetadataStep.UPLOAD_IMAGES_TO_IPFS,
        },
        this.context,
      ).insert();
    }

    if (!collectionMetadata.exists()) {
      await this.writeEventLog({
        logType: LogType.ERROR,
        message: 'Invalid collectionMetadataId for Prepare metadata worker.',
        service: ServiceName.STORAGE,
        data: {
          data,
        },
      });
    }

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
          PrepareCollectionMetadataStep.UPLOAD_IMAGES_TO_IPFS
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
          (x) =>
            x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED &&
            x.fileStatus !=
              FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3,
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
          collectionMetadata.currentStep =
            PrepareCollectionMetadataStep.UPDATE_JSONS_ON_S3;

          await Promise.all([
            imagesSession.update(),
            collectionMetadata.update(),
          ]);
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
            remainingImageFURs.length >
              env.STORAGE_NUM_OF_FILES_IN_SESSION_WITHOUT_DELAY
              ? 900
              : 0,
          );
        }
        return true;
      }

      //Prepare NFT metadata - STEP 2
      if (
        collectionMetadata.currentStep ==
        PrepareCollectionMetadataStep.UPDATE_JSONS_ON_S3
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
          async (metadataFUR: FileUploadRequest) => {
            metadataFUR = new FileUploadRequest(metadataFUR, this.context);

            if (
              !(await s3Client.exists(
                env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
                metadataFUR.s3FileKey,
              ))
            ) {
              console.error(
                `JSON file does not exists on s3 for File upload request. Updating FUR status to ${FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3}`,
                metadataFUR,
              );

              metadataFUR.fileStatus =
                FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3;
              await metadataFUR.update();

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
                fileContent.image = await ipfsCluster.generateLink(
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
          PrepareCollectionMetadataStep.UPLOAD_METADATA_TO_IPFS;
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
        PrepareCollectionMetadataStep.UPLOAD_METADATA_TO_IPFS
      ) {
        //Get metadata session and set it's status if necessary
        const metadataSession = await new FileUploadSession(
          {},
          this.context,
        ).populateByUUID(collectionMetadata.metadataSession);
        if (
          metadataSession.sessionStatus != FileUploadSessionStatus.IN_PROGRESS
        ) {
          metadataSession.sessionStatus = FileUploadSessionStatus.IN_PROGRESS;
          await metadataSession.update();
        }

        const metadataFURs = (
          await new FileUploadRequest(
            {},
            this.context,
          ).populateFileUploadRequestsInSession(
            metadataSession.id,
            this.context,
          )
        ).filter(
          (x) =>
            x.fileStatus != FileUploadRequestFileStatus.UPLOAD_COMPLETED &&
            x.fileStatus !=
              FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3,
        );

        const metadataFiles = await storageBucketSyncFilesToIPFS(
          this.context,
          `${this.constructor.name}/runExecutor`,
          bucket,
          metadataFURs.slice(0, env.STORAGE_MAX_FILE_BATCH_SIZE_FOR_IPFS),
          true,
          'Metadata',
        );

        if (metadataFURs.length > env.STORAGE_MAX_FILE_BATCH_SIZE_FOR_IPFS) {
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
            metadataFURs.length >
              env.STORAGE_NUM_OF_FILES_IN_SESSION_WITHOUT_DELAY
              ? 900
              : 0,
          );

          return true;
        } else {
          metadataSession.sessionStatus = FileUploadSessionStatus.FINISHED;
          collectionMetadata.currentStep =
            PrepareCollectionMetadataStep.PUBLISH_TO_IPNS;

          await Promise.all([
            metadataSession.update(),
            collectionMetadata.update(),
          ]);

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
                  metadataCid: metadataFiles.wrappedDirCid,
                },
              ],
              null,
              null,
            );
          }
          return true;
        }
      }

      //Publish to IPNS, Pin to IPFS, Remove from S3, ...
      if (
        collectionMetadata.currentStep ==
        PrepareCollectionMetadataStep.PUBLISH_TO_IPNS
      ) {
        let ipnsDbRecord: Ipns = null;
        if (data.ipns_uuid) {
          console.info(`pinning metadata CID (${data.metadataCid}) to IPNS`);
          //publish to IPNS
          ipnsDbRecord = await new Ipns({}, this.context).populateByUUID(
            data.ipns_uuid,
          );
          const ipnsRecord = await new IPFSService(
            this.context,
            ipnsDbRecord.project_uuid,
          ).publishToIPNS(
            data.metadataCid,
            `${ipnsDbRecord.project_uuid}_${ipnsDbRecord.bucket_id}_${ipnsDbRecord.id}`,
          );
          ipnsDbRecord.ipnsValue = ipnsRecord.value;
          ipnsDbRecord.key = `${ipnsDbRecord.project_uuid}_${ipnsDbRecord.bucket_id}_${ipnsDbRecord.id}`;
          ipnsDbRecord.cid = data.metadataCid;
          await ipnsDbRecord.update(SerializeFor.UPDATE_DB);
        }

        if (data.runDeployCollectionWorker) {
          //Metadata is prepared. Run nft deploy with cid or ipns as base URI

          //Initialize baseUri
          let baseUri = null;
          if (data.useApillonIpfsGateway) {
            //Get IPFS cluster
            const ipfsCluster = await new ProjectConfig(
              { project_uuid: bucket.project_uuid },
              this.context,
            ).getIpfsCluster();
            baseUri = ipfsCluster.generateLink(
              bucket.project_uuid,
              ipnsDbRecord?.ipnsName || data.metadataCid,
            );
          } else {
            baseUri = ipnsDbRecord?.ipnsName
              ? `ipns://${ipnsDbRecord.ipnsName}`
              : `ipfs://${data.metadataCid}`;
          }

          //Execute deploy collection worker
          if (
            env.APP_ENV == AppEnvironment.LOCAL_DEV ||
            env.APP_ENV == AppEnvironment.TEST
          ) {
            await new NftsMicroservice(
              this.context,
            ).executeDeployCollectionWorker({
              collection_uuid: collectionMetadata.collection_uuid,
              baseUri,
              ipns_uuid: ipnsDbRecord?.ipns_uuid,
            });
          } else {
            await sendToWorkerQueue(
              env.NFTS_AWS_WORKER_SQS_URL,
              'DeployCollectionWorker',
              [
                {
                  collection_uuid: collectionMetadata.collection_uuid,
                  baseUri,
                  ipns_uuid: ipnsDbRecord?.ipns_uuid,
                  cid: data.metadataCid,
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
          PrepareCollectionMetadataStep.METADATA_SUCCESSFULLY_PREPARED;
        await collectionMetadata.update();

        await this.writeEventLog({
          logType: LogType.INFO,
          project_uuid: bucket.project_uuid,
          message: 'PrepareMetadataForCollectionWorker finished!',
          service: ServiceName.STORAGE,
          data: {
            collectionMetadata: collectionMetadata.serialize(),
          },
        });
      }
    } catch (error) {
      console.error('PrepareMetadataForCollectionWorker error', error);
      collectionMetadata.lastError = `Error message: ${error?.message || error?.errorMessage}`;
      await collectionMetadata.update().catch((upgError) => {
        console.error(
          'Error updating collection metadata last error field. ',
          upgError,
        );
      });

      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          project_uuid: bucket.project_uuid,
          message: 'PrepareMetadataForCollectionWorker error!',
          service: ServiceName.STORAGE,
          data: {
            data,
            collectionMetadata: collectionMetadata.serialize(),
            error: collectionMetadata.lastError,
          },
          err: error,
        },
        LogOutput.NOTIFY_ALERT,
      );

      throw error;
    }

    return true;
  }
}

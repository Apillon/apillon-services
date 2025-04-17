import {
  ApiName,
  AppEnvironment,
  AWS_S3,
  CacheKeyPrefix,
  checkProjectSubscription,
  CreateS3UrlsForUploadDto,
  DomainQueryFilter,
  EndFileUploadSessionDto,
  env,
  FilesQueryFilter,
  FileUploadSessionQueryFilter,
  FileUploadsQueryFilter,
  GetQuotaDto,
  invalidateCacheMatch,
  Lmas,
  LogType,
  QuotaCode,
  runWithWorkers,
  Scs,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { v4 as uuidV4 } from 'uuid';
import {
  BucketType,
  DbTables,
  Defaults,
  FileStatus,
  FileUploadSessionStatus,
  StorageErrorCode,
} from '../../config/types';
import { createFURAndS3Url } from '../../lib/create-fur-and-s3-url';
import { StorageCodeException } from '../../lib/exceptions';
import { getSessionFilesOnS3 } from '../../lib/file-upload-session-s3-files';
import { processSessionFiles } from '../../lib/process-session-files';
import { SyncToIPFSWorker } from '../../workers/s3-to-ipfs-sync-worker';
import { WorkerName } from '../../workers/worker-executor';
import { Bucket } from '../bucket/models/bucket.model';
import { ProjectConfig } from '../config/models/project-config.model';
import { HostingService } from '../hosting/hosting.service';
import { Website } from '../hosting/models/website.model';
import { IPFSService } from '../ipfs/ipfs.service';
import { FileUploadRequest } from './models/file-upload-request.model';
import { FileUploadSession } from './models/file-upload-session.model';
import { File } from './models/file.model';
import { IpfsBandwidth } from '../ipfs/models/ipfs-bandwidth';
import { generateJwtSecret } from '../../lib/ipfs-utils';
import { Directory } from '../directory/models/directory.model';
import { GetLinksDto } from '@apillon/lib';

export class StorageService {
  /**
   * Get storage info for project
   * @param event
   * @param context
   * @returns available storage, used storage
   */
  static async getStorageInfo(
    event: { project_uuid: string },
    context: ServiceContext,
  ): Promise<{
    availableStorage: number;
    usedStorage: number;
    availableBandwidth: number;
    usedBandwidth: number;
  }> {
    const project_uuid = event.project_uuid;

    const [quotas, usedStorage, usedBandwidth] = await Promise.all([
      new Scs(context).getQuotas(
        new GetQuotaDto({
          project_uuid,
        }),
      ),
      new Bucket({ project_uuid }, context).getTotalSizeUsedByProject(),
      new IpfsBandwidth({}, context).populateByProjectAndDate(project_uuid),
    ]);

    const storageQuota =
      quotas.find((q) => q.id === QuotaCode.MAX_STORAGE)?.value ||
      Defaults.DEFAULT_STORAGE;

    const bandwidthQuota =
      quotas.find((q) => q.id === QuotaCode.MAX_BANDWIDTH)?.value ||
      Defaults.DEFAULT_BANDWIDTH;

    return {
      availableStorage: storageQuota * Defaults.GIGABYTE_IN_BYTES,
      usedStorage,
      availableBandwidth: bandwidthQuota * Defaults.GIGABYTE_IN_BYTES,
      usedBandwidth: usedBandwidth.exists() ? usedBandwidth.bandwidth : 0,
    };
  }

  /**
   * Check if enough storage available
   * @param context
   * @param project_uuid
   * @param size
   */
  static async checkStorageSpace(
    context: ServiceContext,
    project_uuid: string,
    size: number,
  ) {
    const storageInfo = await StorageService.getStorageInfo(
      { project_uuid },
      context,
    );

    if (storageInfo.usedStorage + size >= storageInfo.availableStorage) {
      throw new StorageCodeException({
        code: StorageErrorCode.NOT_ENOUGH_STORAGE_SPACE,
        status: 400,
      });
    }
  }

  static async getProjectsOverBandwidthQuota(
    event: { query: DomainQueryFilter },
    context: ServiceContext,
  ): Promise<string[]> {
    return await new IpfsBandwidth({}, context).getProjectsOverBandwidthQuota(
      event.query,
    );
  }

  //#region file-upload functions

  static async generateMultipleS3UrlsForUpload(
    event: { body: CreateS3UrlsForUploadDto },
    context: ServiceContext,
  ): Promise<any> {
    //First create fileUploadSession & fileUploadRequest records in DB, then generate S3 signed urls for upload

    //get bucket
    const bucket: Bucket = await new Bucket({}, context).populateByUUID(
      event.body.bucket_uuid,
    );

    if (!bucket.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }
    bucket.canAccess(context);

    //Check if enough storage is available
    await StorageService.checkStorageSpace(context, bucket.project_uuid, 0);

    //Validate content / filenames
    //Freemium projects should't be able to upload html files to non hosting buckets
    if (
      bucket.bucketType != BucketType.HOSTING &&
      !(await checkProjectSubscription(context, bucket.project_uuid))
    ) {
      console.info(
        `Project W/O subscription (${bucket.project_uuid}). Checking fileNames for upload`,
      );
      // Content type can also be checked, but it may not always be provided
      // Disallow files with htm or html extension
      if (
        ['htm', 'html'].some((ext) =>
          event.body.files.find((f) => f.fileName.endsWith(ext)),
        )
      ) {
        throw new StorageCodeException({
          code: StorageErrorCode.HTML_FILES_NOT_ALLOWED,
          status: 400,
        });
      }
    }

    //Get existing or create new fileUploadSession
    let session: FileUploadSession;
    if (event.body.session_uuid) {
      session = undefined;
      session = await new FileUploadSession({}, context).populateByUUID(
        event.body.session_uuid,
      );

      if (!session.exists()) {
        //create new session
        session = new FileUploadSession(
          {
            session_uuid: event.body.session_uuid,
            bucket_id: bucket.id,
            project_uuid: bucket.project_uuid,
          },
          context,
        );
        await session.insert(SerializeFor.INSERT_DB, undefined, true);
      } else if (session.bucket_id != bucket.id) {
        throw new StorageCodeException({
          code: StorageErrorCode.SESSION_UUID_BELONGS_TO_OTHER_BUCKET,
          status: 400,
        });
      } else if (session.sessionStatus != FileUploadSessionStatus.CREATED) {
        throw new StorageCodeException({
          code: StorageErrorCode.FILE_UPLOAD_SESSION_ALREADY_ENDED,
          status: 400,
        });
      }
    } else {
      //create new session
      session = new FileUploadSession(
        {
          session_uuid: uuidV4(),
          bucket_id: bucket.id,
          project_uuid: bucket.project_uuid,
        },
        context,
      );
      await session.insert(SerializeFor.INSERT_DB, undefined, true);
    }

    const s3Client: AWS_S3 = new AWS_S3();

    const files = [];
    await runWithWorkers(
      event.body.files,
      20,
      context,
      async (fileMetadata) => {
        //NOTE - session uuid is added to s3File key.
        /*File key structure:
         * Bucket type(STORAGE, STORAGE_sessions, HOSTING)/bucket id/session uuid if present/path/filename
         */
        const s3FileKey = `${BucketType[bucket.bucketType]}${
          session?.session_uuid ? '_sessions' : ''
        }/${bucket.id}${
          session?.session_uuid ? '/' + session.session_uuid : ''
        }/${
          (fileMetadata.path ? fileMetadata.path : '') + fileMetadata.fileName
        }`;

        files.push(
          await createFURAndS3Url(
            context,
            s3FileKey,
            fileMetadata,
            session,
            bucket,
            s3Client,
          ),
        );
      },
    );

    await new Lmas().writeLog({
      context: context,
      project_uuid: bucket.project_uuid,
      logType: LogType.INFO,
      message: 'S3 urls for upload requested',
      location: `${this.constructor.name}/runExecutor`,
      service: ServiceName.STORAGE,
      data: {
        session: session.serialize(),
        numOfFiles: event.body.files.length,
      },
    });

    return {
      session_uuid: session?.session_uuid,
      files: files,
    };
  }

  static async endFileUploadSession(
    event: {
      session_uuid: string;
      body: EndFileUploadSessionDto;
    },
    context: ServiceContext,
  ): Promise<any> {
    // Get session
    const session = await new FileUploadSession({}, context).populateByUUID(
      event.session_uuid,
    );
    if (!session.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_UPLOAD_SESSION_NOT_FOUND,
        status: 404,
      });
    }

    //get bucket
    const bucket = await new Bucket({}, context).populateById(
      session.bucket_id,
    );
    bucket.canAccess(context);

    if (session.sessionStatus != FileUploadSessionStatus.CREATED) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_UPLOAD_SESSION_ALREADY_ENDED,
        status: 400,
      });
    }

    //update session
    session.sessionStatus = FileUploadSessionStatus.IN_PROGRESS;
    await session.update();

    if (
      bucket.bucketType == BucketType.STORAGE ||
      bucket.bucketType == BucketType.NFT_METADATA
    ) {
      //If more than 1000 files in session, initial file generation should be performed in worker, otherwise timeout can occur.
      const processFilesInSyncWorker =
        (await session.getNumOfFilesInSession()) > 1000;

      if (!processFilesInSyncWorker) {
        await processSessionFiles(context, bucket, session, event.body);
      }
      if (
        env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
      ) {
        if (event.body.directSync) {
          //Directly calls worker, to sync files to IPFS & CRUST - USED ONLY FOR DEVELOPMENT!!
          const serviceDef: ServiceDefinition = {
            type: ServiceDefinitionType.SQS,
            config: { region: 'test' },
            params: { FunctionName: 'test' },
          };
          const parameters = {
            session_uuid: session.session_uuid,
            wrapWithDirectory: event.body.wrapWithDirectory,
            wrappingDirectoryPath: event.body.directoryPath,
            processFilesInSyncWorker,
          };
          const wd = new WorkerDefinition(
            serviceDef,
            WorkerName.SYNC_TO_IPFS_WORKER,
            {
              parameters,
            },
          );

          const worker = new SyncToIPFSWorker(
            wd,
            context,
            QueueWorkerType.EXECUTOR,
          );
          await worker.runExecutor({
            session_uuid: session.session_uuid,
            wrapWithDirectory: event.body.wrapWithDirectory,
            wrappingDirectoryPath: event.body.directoryPath,
            processFilesInSyncWorker,
          });
        }
      } else {
        //send message to SQS
        await sendToWorkerQueue(
          env.STORAGE_AWS_WORKER_SQS_URL,
          WorkerName.SYNC_TO_IPFS_WORKER,
          [
            {
              session_uuid: session.session_uuid,
              wrapWithDirectory: event.body.wrapWithDirectory,
              wrappingDirectoryPath: event.body.directoryPath,
              processFilesInSyncWorker,
            },
          ],
          null,
          null,
        );
      }
    } else if (bucket.bucketType == BucketType.HOSTING) {
      await HostingService.clearBucketContent({ bucket }, context);
      await processSessionFiles(context, bucket, session, event.body);
      //Increase size of bucket - files on website source bucket will never be transferred to ipfs, so the size of bucket won't be increased.
      const filesOnS3 = await getSessionFilesOnS3(
        bucket,
        session?.session_uuid,
      );
      bucket.size += filesOnS3.size;
      await bucket.update();
    }

    return true;
  }

  /**
   * This function is used only for development & testing purposes.
   * In other envirinments, s3 sends this message to queuq automatically, when file is uploaded
   * @param event
   * @param context
   * @returns
   */
  static async endFileUpload(
    event: {
      file_uuid: string;
    },
    context: ServiceContext,
  ): Promise<any> {
    if (
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
      env.APP_ENV == AppEnvironment.TEST
    ) {
      //Get file upload request
      const fur = await new FileUploadRequest({}, context).populateByUUID(
        event.file_uuid,
      );
      if (!fur.exists()) {
        throw new StorageCodeException({
          code: StorageErrorCode.FILE_UPLOAD_REQUEST_NOT_FOUND,
          status: 404,
        });
      }

      const msg = {
        Records: [
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'eu-west-1',
            eventTime: '2022-12-12T07:15:18.165Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: { principalId: 'AWS:AIDAQIMRRA6GKZX7GJVNU' },
            requestParameters: { sourceIPAddress: '89.212.22.116' },
            responseElements: {
              'x-amz-request-id': 'D3KVZ7C5RRZPJ2SR',
              'x-amz-id-2':
                'vPrPgHDXn7A17ce6P+XdUZG2WJufvOJoalcS5vvPzEPKDtm5LZSFN3TjuNrRa3hv72sJICDfSGtM3gpXLilE1EMDl3qUINUA',
            },
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: 'File uploaded to storage directory',
              bucket: {
                name: 'sync-to-ipfs-queue',
                ownerIdentity: { principalId: 'A22UA2G16O19KV' },
                arn: 'arn:aws:s3:::sync-to-ipfs-queue',
              },
              object: {
                key: fur.s3FileKey,
                size: fur.size,
                eTag: 'efea4f1606e3d37048388cc4bebacea6',
                sequencer: '006396D50624FE22EB',
              },
            },
          },
        ],
      };

      //Directly calls worker, to sync file to IPFS & CRUST - USED ONLY FOR DEVELOPMENT!!
      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };
      const parameters = msg;
      const wd = new WorkerDefinition(
        serviceDef,
        WorkerName.SYNC_TO_IPFS_WORKER,
        { parameters },
      );

      const worker = new SyncToIPFSWorker(
        wd,
        context,
        QueueWorkerType.EXECUTOR,
      );
      await worker.runExecutor(msg);

      return true;
    }
    return false;
  }

  static async listFileUploadSessions(
    event: { query: FileUploadSessionQueryFilter },
    context: ServiceContext,
  ) {
    return await new FileUploadSession({}, context).getList(
      context,
      new FileUploadSessionQueryFilter(event.query),
    );
  }

  static async listFileUploads(
    event: { query: FileUploadsQueryFilter },
    context: ServiceContext,
  ) {
    return await new FileUploadRequest({}, context).getList(
      context,
      new FileUploadsQueryFilter(event.query),
    );
  }

  //#endregion

  //#region file functions

  static async listFiles(
    event: { query: FilesQueryFilter },
    context: ServiceContext,
  ) {
    if (context.apiName == ApiName.ADMIN_CONSOLE_API) {
      return await new File({}, context).listAllFiles(
        context,
        new FilesQueryFilter(event.query),
      );
    }
    return await new File({}, context).listFiles(
      context,
      new FilesQueryFilter(event.query),
    );
  }

  static async getFileDetails(
    event: { uuid: string },
    context: ServiceContext,
  ) {
    let file: File = undefined;
    let fileStatus: FileStatus = undefined;
    if (event.uuid) {
      file = await new File({}, context).populateByUUID(event.uuid);
    } else {
      throw new StorageCodeException({
        code: StorageErrorCode.DEFAULT_RESOURCE_NOT_FOUND_ERROR,
        status: 404,
      });
    }

    if (!file.exists()) {
      //try to load and return file data from file-upload-request
      const fur: FileUploadRequest = await new FileUploadRequest(
        {},
        context,
      ).populateByUUID(event.uuid);

      if (fur.exists()) {
        await fur.canAccess(context);
        //check if file uploaded to S3
        const s3Client: AWS_S3 = new AWS_S3();
        if (
          await s3Client.exists(
            env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
            fur.s3FileKey,
          )
        ) {
          fileStatus = FileStatus.UPLOADED_TO_S3;
        } else {
          fileStatus = FileStatus.REQUEST_FOR_UPLOAD_GENERATED;
        }

        return {
          ...fur.serialize(SerializeFor.PROFILE),
          fileStatus: fileStatus,
        };
      }

      throw new StorageCodeException({
        code: StorageErrorCode.FILE_DOES_NOT_EXISTS,
        status: 404,
      });
    }

    file.canAccess(context);

    await file.populateLink();

    return file.serializeByContext();
  }

  static async deleteFile(
    event: { uuid: string },
    context: ServiceContext,
  ): Promise<any> {
    const f: File = await new File({}, context).populateByUUID(event.uuid);
    if (!f.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_NOT_FOUND,
        status: 404,
      });
    }
    f.canModify(context);

    //check bucket
    const b: Bucket = await new Bucket({}, context).populateById(f.bucket_id);

    if (
      b.bucketType == BucketType.STORAGE ||
      b.bucketType == BucketType.NFT_METADATA
    ) {
      await f.markDeleted();
    } else if (b.bucketType == BucketType.HOSTING) {
      await HostingService.deleteFile({ file: f }, context);
    }

    b.size -= f.size;
    await b.update();

    await invalidateCacheMatch(CacheKeyPrefix.BUCKET_LIST, {
      project_uuid: b.project_uuid,
    });

    return true;
  }

  static async restoreFile(
    event: { uuid: string },
    context: ServiceContext,
  ): Promise<any> {
    const f: File = await new File({}, context).populateDeletedById(event.uuid);
    if (!f.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.FILE_NOT_FOUND,
        status: 404,
      });
    }
    f.canModify(context);

    const bucket = await new Bucket({}, context).populateById(f.bucket_id);

    //Check available space
    await StorageService.checkStorageSpace(
      context,
      bucket.project_uuid,
      f.size,
    );

    const conn = await context.mysql.start();
    try {
      f.status = SqlModelStatus.ACTIVE;
      //Increase bucket size
      bucket.size += f.size;

      await f.update(SerializeFor.UPDATE_DB, conn);
      await bucket.update(SerializeFor.UPDATE_DB, conn);

      //Restore parent directories
      if (f.directory_id) {
        let parentDir = await new Directory({}, context).populateById(
          f.directory_id,
          conn,
          false,
          true,
        );

        if (parentDir && parentDir.status != SqlModelStatus.ACTIVE) {
          do {
            parentDir.status = SqlModelStatus.ACTIVE;
            await parentDir.update(SerializeFor.UPDATE_DB, conn);

            if (parentDir.parentDirectory_id) {
              parentDir = await new Directory({}, context).populateById(
                parentDir.parentDirectory_id,
                conn,
              );
            } else {
              parentDir.reset();
            }
          } while (parentDir.exists());
        }
      }

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw new StorageCodeException({
        code: StorageErrorCode.ERROR_RESTORING_FILE,
        status: 500,
      });
    }

    //Send request to pin file back to IPFS cluster
    if (f.CID) {
      await new IPFSService(context, f.project_uuid, true).pinCidToCluster(
        f.CID,
      );
    }

    await invalidateCacheMatch(CacheKeyPrefix.BUCKET_LIST, {
      project_uuid: f.project_uuid,
    });

    return f.serializeByContext();
  }

  /**
   * Get project storage details - num. of buckets, total bucket size, num. of websites
   * Used in admin panel
   * @param {{ project_uuid: string }} - uuid of the project
   * @param {ServiceContext} context
   */
  static async getProjectStorageDetails(
    { project_uuid }: { project_uuid: string },
    context: ServiceContext,
  ): Promise<any> {
    const bucketDetails = await new Bucket(
      { project_uuid },
      context,
    ).getDetailsForProject();
    const numOfWebsites = await new Website(
      { project_uuid },
      context,
    ).getNumOfWebsites();

    return { ...bucketDetails, numOfWebsites };
  }
  //#endregion

  //#region system functions

  /**
   * Return CIDs and IPNS that are blacklisted
   */
  static async getBlacklist(_event: any, context: ServiceContext) {
    return await context.mysql.paramExecute(`
      SELECT DISTINCT cid FROM ${DbTables.BLACKLIST};
    `);
  }

  /**
   * Add all project files to blacklist and unpin them from IPFS
   */
  static async blacklistProjectData(
    event: { project_uuid: string },
    context: ServiceContext,
  ) {
    //Unpin files from IPFS
    const projectFiles = await new File({}, context).populateFilesForProject(
      event.project_uuid,
    );

    const ipfsCluster = await new ProjectConfig(
      { project_uuid: event.project_uuid },
      context,
    ).getIpfsCluster();

    const ipfsService = new IPFSService(context, event.project_uuid, true);

    await runWithWorkers(
      projectFiles,
      [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
        env.APP_ENV as AppEnvironment,
      )
        ? 1
        : 20,
      context,
      async (file: File) => {
        if (ipfsCluster.clusterServer) {
          await ipfsService.unpinCidFromCluster(file.CID);
        } else {
          await ipfsService.unpinFile(file.CID);
        }
      },
    );

    //Block files - This is not necessary, because ipfs proxy checks if project is blocked.
    //Blacklist is edited directly in database
    //await new File({}, context).blockFilesForProject(event.project_uuid);

    return true;
  }

  //#endregion

  static async getIpfsCluster(
    event: { project_uuid: string },
    context: ServiceContext,
  ) {
    return await new ProjectConfig(
      { project_uuid: event.project_uuid },
      context,
    ).getIpfsCluster();
  }

  /**
   * Return secret which is unique for each project
   * @param event
   * @param context
   * @returns secret + basic ipfs cluster properties
   */
  static async getIpfsClusterInfo(
    event: { project_uuid: string },
    context: ServiceContext,
  ) {
    const ipfsCluster = await new ProjectConfig(
      { project_uuid: event.project_uuid },
      context,
    ).getIpfsCluster();

    const ipfsClusterJwtSecretForProject = generateJwtSecret(
      event.project_uuid,
      ipfsCluster.secret,
    );

    return {
      secret: ipfsClusterJwtSecretForProject,
      project_uuid: event.project_uuid,
      ipfsGateway: ipfsCluster.subdomainGateway
        ? `https://<CIDv1>.ipfs.${ipfsCluster.subdomainGateway}`
        : ipfsCluster.ipfsGateway,
      ipnsGateway: ipfsCluster.subdomainGateway
        ? `https://<IPNS>.ipns.${ipfsCluster.subdomainGateway}`
        : ipfsCluster.ipnsGateway,
      loadBalancerIp: ipfsCluster.loadBalancerIp,
    };
  }

  /**
   * Generate link for given CID/IPNS
   * @param event
   * @param context
   * @returns link on ipfs gateway
   */
  static async getLink(
    event: { cid: string; project_uuid: string; type: string },
    context: ServiceContext,
  ) {
    const ipfsCluster = await new ProjectConfig(
      { project_uuid: event.project_uuid },
      context,
    ).getIpfsCluster();

    return {
      link: await ipfsCluster.generateLink(
        event.project_uuid,
        event.cid,
        event.type.toLowerCase() == 'ipns',
        undefined,
        true,
      ),
    };
  }

  static async getLinks(
    event: { body: GetLinksDto; project_uuid: string },
    context: ServiceContext,
  ) {
    const ipfsCluster = await new ProjectConfig(
      { project_uuid: event.project_uuid },
      context,
    ).getIpfsCluster();

    const ipfsService = new IPFSService(context, event.project_uuid, true);

    const links = await Promise.all(
      event.body.cids.map(
        async (cid) =>
          await ipfsCluster.generateLink(
            event.project_uuid,
            cid,
            event.body.type?.toLowerCase() === 'ipns',
            undefined,
            false,
            ipfsService,
          ),
      ),
    );

    return {
      links,
    };
  }

  static async unlinkGithubFromWebsites(
    event: {
      uuids: string[];
    },
    context: ServiceContext,
  ) {
    await new Website({}, context).unlinkGithubFromWebsites(event.uuids);

    return true;
  }
}

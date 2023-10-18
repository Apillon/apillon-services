/* eslint-disable security/detect-non-literal-fs-filename */
import {
  AWS_S3,
  Context,
  env,
  Lmas,
  LogType,
  runWithWorkers,
  ServiceName,
  writeLog,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import axios from 'axios';
import { CID, create, IPFSHTTPClient } from 'ipfs-http-client';
import {
  FileUploadRequestFileStatus,
  StorageErrorCode,
} from '../../config/types';
import { StorageCodeException } from '../../lib/exceptions';
import { Bucket } from '../bucket/models/bucket.model';
import { ProjectConfig } from '../config/models/project-config.model';
import { FileUploadRequest } from '../storage/models/file-upload-request.model';
import { File } from '../storage/models/file.model';
import { uploadItemsToIPFSRes } from './interfaces/upload-items-to-ipfs-res.interface';

export class IPFSService {
  private client: IPFSHTTPClient;
  private project_uuid: string;
  private context: ServiceContext;

  public constructor(context: ServiceContext, project_uuid: string) {
    this.project_uuid = project_uuid;
    this.context = context;
  }

  public async initializeIPFSClient() {
    if (this.client) {
      //IPFS Client is already initialized
      return;
    }

    //Get IPFS gateway

    const ipfsCluster = await new ProjectConfig(
      { project_uuid: this.project_uuid },
      this.context,
    ).getIpfsCluster();

    if (ipfsCluster.ipfsApi.endsWith('/')) {
      ipfsCluster.ipfsApi = ipfsCluster.ipfsApi.slice(0, -1);
    }
    this.client = await create({ url: ipfsCluster.ipfsApi });
  }

  /**
   * Get single file from s3 and upload it to IPFS
   * @param event
   * @param context
   * @returns
   */
  public async uploadFURToIPFSFromS3(
    event: { fileUploadRequest: FileUploadRequest; project_uuid: string },
    context,
  ): Promise<{ CID: CID; cidV0: string; cidV1: string; size: number }> {
    //Initialize IPFS client
    await this.initializeIPFSClient();

    //Get File from S3
    const s3Client: AWS_S3 = new AWS_S3();

    if (
      !(await s3Client.exists(
        env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
        event.fileUploadRequest.s3FileKey,
      ))
    ) {
      throw new StorageCodeException({
        status: 404,
        code: StorageErrorCode.FILE_DOES_NOT_EXISTS_IN_BUCKET,
        sourceFunction: `${this.constructor.name}/uploadFilesToIPFSFromS3`,
        context,
      });
    }

    console.info('Getting file from S3', event.fileUploadRequest.s3FileKey);
    const file = await s3Client.get(
      env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
      event.fileUploadRequest.s3FileKey,
    );

    console.info('Add file to IPFS, ...');
    const filesOnIPFS = await this.client.add({
      content: file.Body as any,
    });

    await this.pinCidToCluster(filesOnIPFS.cid.toV0().toString());

    try {
      (file.Body as any).destroy();
    } catch (err) {
      console.error(err);
    }

    //Write log to LMAS
    await new Lmas().writeLog({
      project_uuid: event.project_uuid,
      logType: LogType.INFO,
      message: 'File uploaded to IPFS',
      location: 'IPFSService.uploadFURsToIPFSFromS3',
      service: ServiceName.STORAGE,
      data: {
        fileUploadRequest: event.fileUploadRequest.serialize(),
        ipfsResponse: {
          cidV0: filesOnIPFS.cid.toV0().toString(),
          filesOnIPFS,
        },
      },
    });

    return {
      CID: filesOnIPFS.cid,
      cidV0: filesOnIPFS.cid.toV0().toString(),
      cidV1: filesOnIPFS.cid.toV1().toString(),
      size: filesOnIPFS.size,
    };
  }

  /**
   * Process file upload requests - in parallel worker, get files from s3 and uploads it to IPFS MFS.
   * Then process files that are in MFS directory to acquire CIDs for folders and files.
   * File upload request statuses, are updated
   * @param event
   * @returns
   */
  public async uploadFURsToIPFSFromS3(
    event: {
      fileUploadRequests: FileUploadRequest[];
      wrapWithDirectory: boolean;
      wrappingDirectoryPath: string;
    },
    context: Context,
  ): Promise<uploadItemsToIPFSRes> {
    console.info(
      'uploadFURsToIPFSFromS3 start',
      event.fileUploadRequests.map((x) => x.serialize()),
    );

    //S3 client
    const s3Client: AWS_S3 = new AWS_S3();
    //Initialize IPFS client
    await this.initializeIPFSClient();

    const bucket: Bucket = await new Bucket({}, context).populateById(
      event.fileUploadRequests[0].bucket_id,
    );

    //Bucket uuid must be used for mfs directory path, because same IPFS is used in different environments. An so bucket id can overlap.
    const mfsDirectoryPath = `/${bucket.bucket_uuid}${
      event.wrappingDirectoryPath ? '/' + event.wrappingDirectoryPath : ''
    }`;

    await runWithWorkers(
      event.fileUploadRequests,
      10,
      context,
      async (fileUploadReq: FileUploadRequest) => {
        console.info(
          'Adding file to IPFS, ...',
          (fileUploadReq.path || '') + fileUploadReq.fileName,
        );
        try {
          let file = await s3Client.get(
            env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
            fileUploadReq.s3FileKey,
          );

          await this.client.files.write(
            mfsDirectoryPath +
              '/' +
              (fileUploadReq.path ? fileUploadReq.path + '/' : '') +
              fileUploadReq.fileName,
            file.Body as any,
            { create: true, parents: true },
          );

          try {
            (file.Body as any).destroy();
          } catch (err) {
            console.error(err);
          }
          file = undefined;
        } catch (error) {
          if (error.Code == 'NoSuchKey') {
            //File does not exists on S3 - update FUR status
            try {
              if (fileUploadReq.exists()) {
                fileUploadReq.fileStatus =
                  FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3;
                await fileUploadReq.update();
              }
            } catch (err) {
              console.error(err);
            }
          } else {
            //Something else does not work - maybe IPFS node. Throw error.
            throw error;
          }
        }
      },
    );

    console.info(
      'runWithWorkers to get files from s3 and add them to IPFS files FINISHED.',
    );

    const mfsDirectoryCID = await this.client.files.stat(mfsDirectoryPath);
    console.info('DIR CID: ', mfsDirectoryCID.cid.toV0().toString());

    /**Directories on IPFS - each dir on IPFS gets CID */
    const ipfsDirectories = [];

    const itemInIpfsMfs = await this.recursiveListIPFSDirectoryContent(
      mfsDirectoryPath,
      '',
    );
    let totalSizeOfFiles = 0;
    console.info(`MFS folder (${mfsDirectoryPath}) content.`, itemInIpfsMfs);

    for (const item of itemInIpfsMfs) {
      if (item.type == 'directory') {
        ipfsDirectories.push({ path: item.name, cid: item.cid });
      } else {
        const fileRequest = event.fileUploadRequests.find(
          (x) => (x.path || '') + x.fileName == item.name,
        );
        if (fileRequest) {
          fileRequest.CID = item.cid;
          fileRequest.size = item.size;
          totalSizeOfFiles += item.size;
        }
      }
    }

    if (mfsDirectoryCID?.cid) {
      //It's probably enough to pin just the parent folder - content should be automatically pinned
      await this.pinCidToCluster(mfsDirectoryCID?.cid.toV0().toString());
    }

    //Write log to LMAS
    await new Lmas().writeLog({
      project_uuid: this.project_uuid,
      logType: LogType.INFO,
      message: 'Files uploaded to IPFS',
      location: 'IPFSService.uploadFilesToIPFSFromS3',
      service: ServiceName.STORAGE,
      data: {
        session_id: event.fileUploadRequests[0].session_id,
        mfsDirectoryCID: mfsDirectoryCID.cid.toV0().toString(),
      },
    });

    return {
      parentDirCID: mfsDirectoryCID?.cid,
      ipfsDirectories: ipfsDirectories,
      size: totalSizeOfFiles,
    };
  }

  /**
   * Get files and directories in IPFS. For directories recursively call this function
   * @param mfsBasePath starting path
   * @param subPath path of subdirectiries
   * @returns flat array of files and directories
   */
  public async recursiveListIPFSDirectoryContent(
    mfsBasePath: string,
    subPath: string,
  ) {
    //Initialize IPFS client
    await this.initializeIPFSClient();

    const content: any[] = [];

    const dirContent = this.client.files.ls(mfsBasePath + subPath);
    for await (const f of dirContent) {
      if (f.type == 'directory') {
        content.push(
          ...(await this.recursiveListIPFSDirectoryContent(
            mfsBasePath,
            subPath + '/' + f.name,
          )),
        );
      }
      f.name = (subPath + '/' + f.name).substring(1);
      content.push(f);
    }

    return content;
  }

  /**
   * Upload files (FIle records already exists in bucket), to IPFS. Create array of FURS and call general function to upload FURs to IPFS.
   * On success, update file CID.
   * @param event
   * @returns
   */
  public async uploadFilesToIPFSFromS3(
    event: {
      files: File[];
      wrapWithDirectory: boolean;
      wrappingDirectoryPath: string;
    },
    context: Context,
  ): Promise<uploadItemsToIPFSRes> {
    //Create array of fileUploadRequests - some properties does not match, so they have to be populated
    const fileUploadRequests: FileUploadRequest[] = [];
    for (const file of event.files) {
      const fur: FileUploadRequest = new FileUploadRequest(
        file,
        context,
      ).populate({
        fileName: file.name,
      });

      fileUploadRequests.push(fur);
    }

    const syncToIpfsRes = await this.uploadFURsToIPFSFromS3(
      {
        fileUploadRequests: fileUploadRequests,
        wrapWithDirectory: event.wrapWithDirectory,
        wrappingDirectoryPath: event.wrappingDirectoryPath,
      },
      context,
    );

    //Update CID and size properties of event.files, as files are returned to parent function by reference
    for (const file of event.files) {
      const fur = fileUploadRequests.find((x) => x.file_uuid == file.file_uuid);
      file.CID = fur.CID.toV0().toString();
      file.CIDv1 = fur.CID.toV1().toString();
      file.size = fur.size;
    }

    return syncToIpfsRes;
  }

  /**
   * Publish IPNS record. If key not exists new one is created.
   * @param cid CID which will be represented with IPNS
   * @param ipfsKey private key used to publish IPNS
   * @returns
   */
  public async publishToIPNS(
    cid: string,
    ipfsKey: string,
  ): Promise<{ name: string; value: string }> {
    //Initialize IPFS client
    await this.initializeIPFSClient();

    let ipnsRes = undefined;
    try {
      ipnsRes = await this.client.name.publish(cid, {
        key: ipfsKey,
        resolve: false,
      });
    } catch (err) {
      if (err.message == 'no key by the given name was found') {
        await this.client.key.gen(ipfsKey, {
          type: 'rsa',
          size: 2048,
        });
        ipnsRes = await this.client.name.publish(cid, {
          key: ipfsKey,
          resolve: false,
        });
      } else {
        throw err;
      }
    }
    return ipnsRes;
  }

  /**
   * Publish IPNS record.
   * NOTE: Use this function if you are sure, that key does not exists on IPFS.
   * @param cid CID which will be represented with IPNS
   * @param ipfsKey private key used to publish IPNS
   * @returns
   */
  public async generateKeyAndPublishToIPNS(
    cid: string,
    ipfsKey: string,
  ): Promise<{ name: string; value: string }> {
    //Initialize IPFS client
    await this.initializeIPFSClient();

    await this.client.key.gen(ipfsKey, {
      type: 'rsa',
      size: 2048,
    });

    let ipnsRes = undefined;
    ipnsRes = await this.client.name.publish(cid, {
      key: ipfsKey,
      resolve: false,
    });

    return ipnsRes;
  }

  public async getFileFromIPFS(params: { cid: string }) {
    //Initialize IPFS client
    await this.initializeIPFSClient();

    const file = await this.client.get(params.cid);

    const res = [];

    for await (const f of file) {
      res.push(f);
    }

    return res;
  }

  public async listIPFSDirectory(param: any) {
    //Initialize IPFS client
    await this.initializeIPFSClient();

    const ls = await this.client.ls(param.cid);

    const filesInDirectory = [];
    for await (const f of ls) {
      console.info(f);
      filesInDirectory.push({
        cidV0: f.cid.toV0().toString(),
        cidV1: f.cid.toV1().toString(),
        ...f,
      });
    }

    return filesInDirectory;
  }

  /**
   * Call cluster API to PIN specific CID to child nodes
   * @param cid cid to be pinned
   */
  public async pinCidToCluster(cid: string) {
    const ipfsCluster = await new ProjectConfig(
      { project_uuid: this.project_uuid },
      this.context,
    ).getIpfsCluster();

    try {
      await axios.post(ipfsCluster.clusterServer + `pins/ipfs/${cid}`, {}, {});
    } catch (err) {
      writeLog(
        LogType.ERROR,
        `Error pinning cid to cluster server`,
        'ipfs.service.ts',
        'pinCidToCluster',
        err,
      );
    }
  }

  /**
   * Unpin file from IPFS node - file will eventually be deleted from this node
   * @param cid
   * @returns
   */
  public async unpinFile(cid: string) {
    try {
      //Initialize IPFS client
      await this.initializeIPFSClient();
      await this.client.pin.rm(cid);
    } catch (err) {
      console.error('Error unpinning file', cid, err);
    }
  }

  /**
   * Lists through pinned items on IPFS and checks if give CID is pinned.
   * @param cid
   * @returns true, if CID is pinned on IPFS
   */
  public async isCIDPinned(cid: string) {
    if (!cid) {
      return false;
    }
    //Initialize IPFS client
    await this.initializeIPFSClient();
    try {
      const lsRes = await this.client.pin.ls({ paths: [CID.parse(cid)] });
      for await (const {} of lsRes) {
        return true;
      }
    } catch (err) {
      if (err.message && err.message.includes('is not pinned')) {
        return false;
      }
      throw err;
    }
    return false;
  }

  /**
   * Function, used for testing purposes. To upload fake file to IPFS
   * @param params file path and file content
   * @returns cidv0 & cidV1
   */
  public async addFileToIPFS(params: {
    path: string;
    content: any;
  }): Promise<{ cidV0: string; cidV1: string }> {
    //Initialize IPFS client
    await this.initializeIPFSClient();

    //Add to IPFS
    const fileOnIPFS = await this.client.add({
      path: params.path,
      content: params.content,
    });

    return {
      cidV0: fileOnIPFS.cid.toV0().toString(),
      cidV1: fileOnIPFS.cid.toV1().toString(),
    };
  }

  public async getCIDSize(cid: string) {
    //Initialize IPFS client
    await this.initializeIPFSClient();

    const ls = await this.client.ls(cid);

    for await (const f of ls) {
      console.info(f);
      if (f.cid.toV0().toString() == cid) {
        return f.size;
      }
    }

    return 0;
  }
}

/* eslint-disable security/detect-non-literal-fs-filename */
import {
  AWS_S3,
  CodeException,
  Context,
  env,
  Lmas,
  LogType,
  runWithWorkers,
  ServiceName,
  writeLog,
} from '@apillon/lib';
import { CID, create } from 'ipfs-http-client';
import {
  FileUploadRequestFileStatus,
  StorageErrorCode,
} from '../../config/types';
import { StorageCodeException } from '../../lib/exceptions';
import { FileUploadRequest } from '../storage/models/file-upload-request.model';
import { File } from '../storage/models/file.model';
import { uploadItemsToIPFSRes } from './interfaces/upload-items-to-ipfs-res.interface';
import axios from 'axios';
import { Bucket } from '../bucket/models/bucket.model';

export class IPFSService {
  static async createIPFSClient() {
    //CRUST Gateway
    //return await CrustService.createIPFSClient();

    //Kalmia IPFS Gateway
    if (!env.STORAGE_IPFS_API) {
      throw new StorageCodeException({
        status: 500,
        code: StorageErrorCode.STORAGE_IPFS_API_NOT_SET,
        sourceFunction: `${this.constructor.name}/createIPFSClient`,
      });
    }
    writeLog(
      LogType.INFO,
      `Connection to IPFS gateway: ${env.STORAGE_IPFS_API}`,
      'ipfs.service.ts',
      'createIPFSClient',
    );

    let ipfsGatewayURL = env.STORAGE_IPFS_API;
    if (ipfsGatewayURL.endsWith('/')) {
      ipfsGatewayURL = ipfsGatewayURL.slice(0, -1);
    }
    return await create({ url: ipfsGatewayURL });
  }

  /**
   * Get single file from s3 and upload it to IPFS
   * @param event
   * @param context
   * @returns
   */
  static async uploadFURToIPFSFromS3(
    event: { fileUploadRequest: FileUploadRequest; project_uuid?: string },
    context,
  ): Promise<{ CID: CID; cidV0: string; cidV1: string; size: number }> {
    //Get IPFS client
    let client = await IPFSService.createIPFSClient();

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
    let file = await s3Client.get(
      env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
      event.fileUploadRequest.s3FileKey,
    );

    console.info('Add file to IPFS, ...');
    const filesOnIPFS = await client.add({
      content: file.Body as any,
    });

    await IPFSService.pinCidToCluster(filesOnIPFS.cid.toV0().toString());

    try {
      (file.Body as any).destroy();
    } catch (err) {
      console.error(err);
    }
    file = undefined;
    client = undefined;

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
  static async uploadFURsToIPFSFromS3(
    event: {
      fileUploadRequests: FileUploadRequest[];
      wrapWithDirectory: boolean;
      wrappingDirectoryPath: string;
      project_uuid?: string;
    },
    context: Context,
  ): Promise<uploadItemsToIPFSRes> {
    console.info(
      'uploadFURsToIPFSFromS3 start',
      event.fileUploadRequests.map((x) => x.serialize()),
    );

    //S3 client
    const s3Client: AWS_S3 = new AWS_S3();
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

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

          await client.files.write(
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

    const mfsDirectoryCID = await client.files.stat(mfsDirectoryPath);
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
      await IPFSService.pinCidToCluster(mfsDirectoryCID?.cid.toV0().toString());
    }

    //Write log to LMAS
    await new Lmas().writeLog({
      project_uuid: event.project_uuid,
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
  static async recursiveListIPFSDirectoryContent(
    mfsBasePath: string,
    subPath: string,
  ) {
    const client = await IPFSService.createIPFSClient();
    const content: any[] = [];

    const dirContent = client.files.ls(mfsBasePath + subPath);
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
  static async uploadFilesToIPFSFromS3(
    event: {
      files: File[];
      wrapWithDirectory: boolean;
      wrappingDirectoryPath: string;
      project_uuid?: string;
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
        project_uuid: event.project_uuid,
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
  static async publishToIPNS(
    cid: string,
    ipfsKey: string,
  ): Promise<{ name: string; value: string }> {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    let ipnsRes = undefined;
    try {
      ipnsRes = await client.name.publish(cid, {
        key: ipfsKey,
        resolve: false,
      });
    } catch (err) {
      if (err.message == 'no key by the given name was found') {
        await client.key.gen(ipfsKey, {
          type: 'rsa',
          size: 2048,
        });
        ipnsRes = await client.name.publish(cid, {
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
  static async generateKeyAndPublishToIPNS(
    cid: string,
    ipfsKey: string,
  ): Promise<{ name: string; value: string }> {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    await client.key.gen(ipfsKey, {
      type: 'rsa',
      size: 2048,
    });

    let ipnsRes = undefined;
    ipnsRes = await client.name.publish(cid, {
      key: ipfsKey,
      resolve: false,
    });

    return ipnsRes;
  }

  static async getFileFromIPFS(params: { cid: string }) {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    const file = await client.get(params.cid);

    const res = [];

    for await (const f of file) {
      res.push(f);
    }

    return res;
  }

  static async listIPFSDirectory(param: any) {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    const ls = await client.ls(param.cid);

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
  static async pinCidToCluster(cid: string) {
    if (!env.STORAGE_IPFS_CLUSTER_SERVER) {
      writeLog(
        LogType.ERROR,
        `STORAGE_IPFS_CLUSTER_SERVER is not set!`,
        'ipfs.service.ts',
        'pinCidToCluster',
      );
      return;
    }
    try {
      await axios.post(
        env.STORAGE_IPFS_CLUSTER_SERVER + `pins/ipfs/${cid}`,
        {},
        {},
      );
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
  static async unpinFile(cid: string) {
    try {
      //Get IPFS client
      const client = await IPFSService.createIPFSClient();
      await client.pin.rm(cid);
      console.info('File sucessfully unpined', cid);
    } catch (err) {
      console.error('Error unpinning file', cid, err);
      return false;
    }

    return true;
  }

  /**
   * Lists through pinned items on IPFS and checks if give CID is pinned.
   * @param cid
   * @returns true, if CID is pinned on IPFS
   */
  static async isCIDPinned(cid: string) {
    if (!cid) {
      return false;
    }
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();
    try {
      const lsRes = await client.pin.ls({ paths: [CID.parse(cid)] });
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
  static async addFileToIPFS(params: {
    path: string;
    content: any;
  }): Promise<{ cidV0: string; cidV1: string }> {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    //Add to IPFS
    const fileOnIPFS = await client.add({
      path: params.path,
      content: params.content,
    });

    return {
      cidV0: fileOnIPFS.cid.toV0().toString(),
      cidV1: fileOnIPFS.cid.toV1().toString(),
    };
  }

  static async getCIDSize(cid: string) {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    const ls = await client.ls(cid);

    for await (const f of ls) {
      console.info(f);
      if (f.cid.toV0().toString() == cid) {
        return f.size;
      }
    }

    return 0;
  }
}

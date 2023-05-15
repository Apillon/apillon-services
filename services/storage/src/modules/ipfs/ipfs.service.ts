/* eslint-disable security/detect-non-literal-fs-filename */
import {
  AWS_S3,
  CodeException,
  env,
  Lmas,
  LogType,
  ServiceName,
  writeLog,
} from '@apillon/lib';
import { CID, create } from 'ipfs-http-client';
import { StorageErrorCode } from '../../config/types';
import { StorageCodeException } from '../../lib/exceptions';
import { FileUploadRequest } from '../storage/models/file-upload-request.model';
import { File } from '../storage/models/file.model';
import { uploadFilesToIPFSRes } from './interfaces/upload-files-to-ipfs-res.interface';

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

  static async uploadFURToIPFSFromS3(
    event: { fileUploadRequest: FileUploadRequest },
    context,
  ): Promise<{ CID: CID; cidV0: string; cidV1: string; size: number }> {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

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

    const file = await s3Client.get(
      env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
      event.fileUploadRequest.s3FileKey,
    );

    const filesOnIPFS = await client.add({
      content: file.Body as any,
    });

    //Write log to LMAS
    await new Lmas().writeLog({
      logType: LogType.INFO,
      message: 'File uploaded to IPFS',
      location: 'IPFSService.uploadFURsToIPFSFromS3',
      service: ServiceName.STORAGE,
      data: {
        fileUploadRequest: event.fileUploadRequest,
        ipfsResponse: filesOnIPFS,
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
   * Process file upload request, get each one from s3 and assemble array of files, that will bi added to IPFS.
   * File upload request statuses, are updated
   * @param event
   * @returns
   */
  static async uploadFURsToIPFSFromS3(event: {
    fileUploadRequests: FileUploadRequest[];
    wrapWithDirectory: boolean;
  }): Promise<uploadFilesToIPFSRes> {
    console.info(
      'uploadFURsToIPFSFromS3 start',
      event.fileUploadRequests.map((x) => x.serialize()),
    );

    //S3 client
    const s3Client: AWS_S3 = new AWS_S3();

    const filesForIPFS = [];

    for (const fileUploadReq of event.fileUploadRequests) {
      console.info(
        'Get file from S3 START',
        (fileUploadReq.path || '') + fileUploadReq.fileName,
      );
      try {
        const file = await s3Client.get(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          fileUploadReq.s3FileKey,
        );

        filesForIPFS.push({
          path: (fileUploadReq.path || '') + fileUploadReq.fileName,
          content: file.Body as any,
        });
      } catch (error) {
        console.error('Get file from s3 error', error);
      }

      console.info(
        'Get file from S3 SUCCESS',
        (fileUploadReq.path || '') + fileUploadReq.fileName,
      );
    }

    console.info(
      'runWithWorkers to get files from s3 SUCCESS. Num of files: ' +
        filesForIPFS.length,
    );

    /**Wrapping directory CID*/
    let baseDirectoryOnIPFS = undefined;
    /**Directories on IPFS - each dir on IPFS gets CID */
    const ipfsDirectories = [];

    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    console.info(
      'Adding files to IPFS',
      filesForIPFS.map((x) => x.path),
    );
    const filesOnIPFS = await client.addAll(filesForIPFS, {
      wrapWithDirectory: event.wrapWithDirectory,
    });

    console.info('Files were successfully uploaded to IPFS', filesOnIPFS);

    /**Loop through IPFS result and set CID property in fileUploadRequests */
    for await (const file of filesOnIPFS) {
      if (file.path === '') {
        baseDirectoryOnIPFS = file;
        continue;
      }
      //Map IPFS result to fileUploadRequests if file or add record to IPFSDirectories if directory
      const fileRequest = event.fileUploadRequests.find(
        (x) => (x.path || '') + x.fileName == file.path,
      );
      if (fileRequest) {
        fileRequest.CID = file.cid;
        fileRequest.size = file.size;
      } else {
        ipfsDirectories.push({ path: file.path, cid: file.cid });
      }
    }

    //Write log to LMAS
    await new Lmas().writeLog({
      logType: LogType.INFO,
      message: 'Files uploaded to IPFS',
      location: 'IPFSService.uploadFilesToIPFSFromS3',
      service: ServiceName.STORAGE,
      data: {
        fileUploadRequests: event.fileUploadRequests,
        ipfsResponse: filesOnIPFS,
      },
    });

    return {
      parentDirCID: baseDirectoryOnIPFS?.cid,
      ipfsDirectories: ipfsDirectories,
      size: baseDirectoryOnIPFS?.size,
    };
  }

  /**
   * Upload files (FIle records already exists in bucket), to IPFS. Loop, get from s3, and pusth to IPFS.
   * On success, update file CID.
   * @param event
   * @returns
   */
  static async uploadFilesToIPFSFromS3(event: {
    files: File[];
    wrapWithDirectory: boolean;
  }): Promise<uploadFilesToIPFSRes> {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    //S3 client
    const s3Client: AWS_S3 = new AWS_S3();

    const filesForIPFS = [];

    for (const file of event.files) {
      if (
        !(await s3Client.exists(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          file.s3FileKey,
        ))
      ) {
        continue;
      }

      const fileOnS3 = await s3Client.get(
        env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
        file.s3FileKey,
      );

      filesForIPFS.push({
        path: (file.path || '') + file.name,
        content: fileOnS3.Body as any,
      });
    }

    /**Wrapping directory CID*/
    let baseDirectoryOnIPFS = undefined;
    /**Directories on IPFS - each dir on IPFS gets CID */
    const ipfsDirectories = [];
    const objectOnIPFS = await client.addAll(filesForIPFS, {
      wrapWithDirectory: event.wrapWithDirectory,
    });

    /**Loop through IPFS result and set CID property in files */
    for await (const objectOnIpfs of objectOnIPFS) {
      if (objectOnIpfs.path === '') {
        baseDirectoryOnIPFS = objectOnIpfs;
        continue;
      }
      //Map IPFS result to files and directories
      const file: File = event.files.find(
        (x) => (x.path || '') + x.name == objectOnIpfs.path,
      );
      if (file) {
        file.CID = objectOnIpfs.cid.toV0().toString();
        file.size = objectOnIpfs.size;
      } else {
        ipfsDirectories.push({
          path: objectOnIpfs.path,
          cid: objectOnIpfs.cid,
        });
      }
    }

    //Write log to LMAS
    await new Lmas().writeLog({
      logType: LogType.INFO,
      message: 'Files uploaded to IPFS',
      location: 'IPFSService.uploadFilesToIPFSFromS3',
      service: ServiceName.STORAGE,
      data: {
        files: event.files,
        ipfsResponse: objectOnIPFS,
      },
    });

    return {
      parentDirCID: baseDirectoryOnIPFS?.cid,
      ipfsDirectories: ipfsDirectories,
      size: baseDirectoryOnIPFS?.size,
    };
  }

  /**
   *
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
    let key = undefined;
    let existingKeys = undefined;
    try {
      existingKeys = (await client.key.list()).filter((x) => x.name == ipfsKey);
    } catch (err) {
      writeLog(
        LogType.ERROR,
        `Error publishing to IPNS. Cid: ${cid}, Key: ${ipfsKey}`,
        'ipfs.service.ts',
        'createIPFSClient',
        err,
      );
    }

    //Generate new key or use existing
    if (!existingKeys || existingKeys.length == 0) {
      key = await client.key.gen(ipfsKey, {
        type: 'rsa',
        size: 2048,
      });
    } else {
      key = existingKeys[0];
    }
    //Check key
    if (!key || key.length == 0) {
      throw new CodeException({
        status: 500,
        code: StorageErrorCode.FAILED_TO_GENERATE_IPFS_KEYPAIR,
      });
    } else {
    }
    //Publish CID to IPNS
    return await client.name.publish(cid, { key: key.id });
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

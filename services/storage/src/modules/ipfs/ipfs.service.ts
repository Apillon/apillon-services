/* eslint-disable security/detect-non-literal-fs-filename */
import { AWS_S3, env } from '@apillon/lib';
import { CID, create } from 'ipfs-http-client';
import {
  FileUploadRequestFileStatus,
  StorageErrorCode,
} from '../../config/types';
import { StorageCodeException } from '../../lib/exceptions';
import { FileUploadRequest } from '../storage/models/file-upload-request.model';

export class IPFSService {
  static async createIPFSClient() {
    //CRUST Gateway
    //return await CrustService.createIPFSClient();

    //Kalmia IPFS Gateway
    if (!env.STORAGE_IPFS_GATEWAY)
      throw new StorageCodeException({
        status: 500,
        code: StorageErrorCode.STORAGE_IPFS_GATEWAY_NOT_SET,
        sourceFunction: `${this.constructor.name}/createIPFSClient`,
      });
    console.info('Connection to IPFS gateway: ', env.STORAGE_IPFS_GATEWAY);

    let ipfsGatewayURL = env.STORAGE_IPFS_GATEWAY;
    if (ipfsGatewayURL.endsWith('/'))
      ipfsGatewayURL = ipfsGatewayURL.slice(0, -1);
    return await create({ url: ipfsGatewayURL });
  }

  static async uploadFileToIPFSFromS3(
    event: { fileKey: string },
    context,
  ): Promise<{ CID: CID; cidV0: string; cidV1: string; size: number }> {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    //Get File from S3
    const s3Client: AWS_S3 = new AWS_S3();

    console.info(`Get file from AWS s3`);

    if (
      !(await s3Client.exists(env.STORAGE_AWS_IPFS_QUEUE_BUCKET, event.fileKey))
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
      event.fileKey,
    );

    console.info(`File recieved, pushing to IPFS...`);

    const filesOnIPFS = await client.add({
      path: '',
      content: file.Body as any,
    });

    console.info(`File added to IPFS...uploadFileToIPFSFromS3 success.`);

    //const key = await client.key.gen('myTestPage');
    //const ipnsRes = await client.name.publish(filesOnIPFS.cid);

    return {
      CID: filesOnIPFS.cid,
      cidV0: filesOnIPFS.cid.toV0().toString(),
      cidV1: filesOnIPFS.cid.toV1().toString(),
      size: filesOnIPFS.size,
      //ipnsRes: ipnsRes,
    };
  }

  static async uploadFilesToIPFSFromS3(event: {
    fileUploadRequests: FileUploadRequest[];
    wrapWithDirectory: boolean;
  }): Promise<{
    parentDirCID: CID;
    ipfsDirectories: { path: string; cid: CID }[];
    size: number;
  }> {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    //S3 client
    const s3Client: AWS_S3 = new AWS_S3();

    const filesForIPFS = [];

    for (const fileUploadReq of event.fileUploadRequests) {
      if (
        !(await s3Client.exists(
          env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
          fileUploadReq.s3FileKey,
        ))
      ) {
        fileUploadReq.fileStatus =
          FileUploadRequestFileStatus.ERROR_FILE_NOT_EXISTS_ON_S3;
        continue;
      }

      const file = await s3Client.get(
        env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
        fileUploadReq.s3FileKey,
      );

      filesForIPFS.push({
        path: (fileUploadReq.path || '') + fileUploadReq.fileName,
        content: file.Body as any,
      });
    }

    /**Wrapping directory CID*/
    let baseDirectoryOnIPFS = undefined;
    /**Directories on IPFS - each dir on IPFS gets CID */
    const ipfsDirectories = [];
    const filesOnIPFS = await client.addAll(filesForIPFS, {
      wrapWithDirectory: event.wrapWithDirectory,
    });

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
    try {
      key = (await client.key.list()).filter((x) => x.name == ipfsKey);
    } catch (err) {
      console.error(err);
    }

    if (!key) key = await client.key.gen(ipfsKey);
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
    console.log(param);
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

  //#region OBSOLETE

  static async uploadFilesToIPFS(params: { files: any[] }): Promise<any> {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    for (const file of params.files) {
      // call Core API methods
      file.content = Buffer.from(file.content, 'base64');
      //console.log('file, added to IPFS', file.content);

      const filesOnIPFS = await client.add(file);
      file.cidV0 = filesOnIPFS.cid.toV0().toString();
      file.cidV1 = filesOnIPFS.cid.toV1().toString();
    }

    return params.files;
  }

  static async uploadDirectoryToIPFS(): Promise<any> {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    //Methods, that are available in client instance: https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md

    // call Core API methods
    const filesOnIPFS = await client.addAll([
      {
        path: 'parentDirectory/subDir1/hello.txt',
        content: 'Hello world!',
      },
      {
        path: 'parentDirectory/subDir2/aloha.txt',
        content: 'Example content - this could be anything (string, Blob...)',
      },
      {
        path: 'parentDirectory/readme.md',
        content: 'This is content of readme.md',
      },
    ]);

    const res: CID[] = [];
    for await (const file of filesOnIPFS) {
      console.log(file);
      res.push(file.cid);
    }

    const ipnsVal = await client.name.publish(
      'QmdWsuHuHaW7YeenSNimy6d1osA8dwVEnALxHq7PKTEXa5',
    );
    console.info(ipnsVal);

    return res;
  }

  //#endregion
}

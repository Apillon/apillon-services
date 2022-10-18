import { AWS_S3, CodeException, env, SystemErrorCode } from 'at-lib';
import { CID, create } from 'ipfs-http-client';
import { StorageErrorCode } from '../config/types';
import { StorageCodeException } from '../lib/exceptions';
import { CrustService } from './crust.service';

export class IPFSService {
  static async createIPFSClient() {
    //CRUST Gateway
    //return await CrustService.createIPFSClient();

    //Kalmia IPFS Gateway
    return create({ url: env.AT_STORAGE_IPFS_GATEWAY });
  }

  static async uploadFilesToIPFSFromS3(event, context): Promise<any> {
    //Get IPFS client
    const client = await IPFSService.createIPFSClient();

    //Get File from S3
    const s3Client: AWS_S3 = new AWS_S3();

    if (
      !(await s3Client.exists(
        env.AT_STORAGE_AWS_IPFS_QUEUE_BUCKET,
        event.fileKey,
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
      env.AT_STORAGE_AWS_IPFS_QUEUE_BUCKET,
      event.fileKey,
    );
    console.info('FILE METADATA', file.Metadata);
    const filesOnIPFS = await client.add({
      path: '',
      content: file.Body as any,
    });

    //const key = await client.key.gen('myTestPage');
    //const ipnsRes = await client.name.publish(filesOnIPFS.cid);

    return {
      cidV0: filesOnIPFS.cid.toV0().toString(),
      cidV1: filesOnIPFS.cid.toV1().toString(),
      size: filesOnIPFS.size,
      //ipnsRes: ipnsRes,
    };
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

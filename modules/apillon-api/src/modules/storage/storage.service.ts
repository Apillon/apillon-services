import { Body, Injectable } from '@nestjs/common';
import { Storage } from 'at-lib';
import { createReadStream } from 'fs';
import { create } from 'ipfs-http-client';
import { ApillonApiContext } from '../../context';
import { UploadFilesToIPFSDto } from './dtos/upload-files-to-IPFS';
import { StorageMicroservice } from './microservice/storage.microservice';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  // //#region Regular APIs

  // /**
  //  * Lists IPFS directory - directory has its own CID
  //  * @returns true if success
  //  */
  // async listIPFSDirectory() {
  //   const client = create({ url: 'http://127.0.0.1:5001/api/v0' });

  //   // call Core API methods
  //   const file = await client.ls(
  //     'QmWv5LZ3EXa9g2vzeYrZMDboESkmmQmiYWbZgaFmESX5vF',
  //   );

  //   const files: any[] = [];

  //   for await (const f of file) {
  //     console.info(f);
  //     files.push(f);
  //   }
  //   return files;
  // }

  // async getFileFromIPFS() {
  //   const client = create({ url: 'http://127.0.0.1:5001/api/v0' });

  //   // call Core API methods
  //   const file = await client.cat(
  //     'QmQzCQn4puG4qu8PVysxZmscmQ5vT1ZXpqo7f58Uh9QfyY',
  //   );

  //   for await (const f of file) {
  //     console.log(f.toString());
  //   }
  //   return true;
  // }

  // async uploadFileToIPFS(): Promise<any> {
  //   // connect to a different API
  //   const client = create({ url: 'http://127.0.0.1:5001/api/v0' });

  //   //Methods, that are available in client instance: https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md

  //   // call Core API methods
  //   const { cid } = await client.add({
  //     path: 'myDirectory/helloWorld2.txt',
  //     content: 'Hello world 2!',
  //   });
  //   console.log(cid);
  //   return true;
  // }

  // async uploadFilesToIPFS(): Promise<any> {
  //   // call microservice
  //   await new Storage().addFileToIPFS();
  // }

  // //#endregion

  // //#region CRUST functions

  // // Create global chain instance
  // crustChainEndpoint = 'wss://rpc.crust.network';
  // api = new ApiPromise({
  //   provider: new WsProvider(this.crustChainEndpoint),
  //   typesBundle: typesBundleForPolkadot,
  // });

  // async placeStorageOrder(fileCid: string) {
  //   // 1. Construct place-storage-order tx
  //   const fileSize = 2 * 1024 * 1024 * 1024; // Let's say 2 gb(in byte)
  //   const tips = 0;
  //   const memo = '';
  //   const tx = this.api.tx.market.placeStorageOrder(
  //     fileCid,
  //     fileSize,
  //     tips,
  //     memo,
  //   );

  //   // 2. Load seeds(account)
  //   const seeds = 'xxx xxx xxx xxx xxx xxx xxx xxx xxx xxx xxx xxx';
  //   const kr = new Keyring({ type: 'sr25519' });
  //   const krp = kr.addFromUri(seeds);

  //   // 3. Send transaction
  //   await this.api.isReadyOrError;
  //   return new Promise((resolve, reject) => {
  //     tx.signAndSend(krp, ({ events = [], status }) => {
  //       console.log(`💸  Tx status: ${status.type}, nonce: ${tx.nonce}`);

  //       if (status.isInBlock) {
  //         events.forEach(({ event: { method, section } }) => {
  //           if (method === 'ExtrinsicSuccess') {
  //             console.log(`✅  Place storage order success!`);
  //             resolve(true);
  //           }
  //         });
  //       } else {
  //         // Pass it
  //       }
  //     }).catch((e) => {
  //       reject(e);
  //     });
  //   });
  // }

  // async getOrderState(cid: string) {
  //   await this.api.isReadyOrError;
  //   return await this.api.query.market.filesV2(cid);
  // }

  // //#endregion

  async testuploadFileToIPFS(): Promise<any> {
    // connect to a different API
    const client = create({ url: 'http://127.0.0.1:5001/api/v0' });

    //Methods, that are available in client instance: https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md

    const fileContent = createReadStream('test.txt');

    console.info(fileContent);

    // call Core API methods
    const { cid } = await client.add({
      path: 'myDirectory/helloWorld2.txt',
      content: fileContent,
    });
    console.log(cid);
    return true;
  }

  //#region storage microservice calls

  async uploadFilesToIPFS(
    ctx: ApillonApiContext,
    data: UploadFilesToIPFSDto,
  ): Promise<any> {
    // call microservice
    return await new StorageMicroservice().addFileToIPFS({ files: data.files });
  }

  async requestS3SignedURLForUpload(
    ctx: ApillonApiContext,
    data: any,
  ): Promise<any> {
    return await new StorageMicroservice().requestS3SignedURLForUpload({
      session_uuid: uuidv4(),
      bucket_uuid: uuidv4(),
      contentType: data.contentType,
      fileName: data.fileName,
    });
  }

  async uploadFilesToIPFSFromS3(
    ctx: ApillonApiContext,
    data: any,
  ): Promise<any> {
    // call microservice
    const res = await new StorageMicroservice().addFileToIPFSFromS3({
      fileKey: data.fileKey,
    });

    if (res.success) {
      console.log('FIle successfully pushed to IPFS. Placing storage order...');
      const placeStorageRequestResponse =
        await new StorageMicroservice().placeStorageOrderToCRUST({
          cid: res.data.cidV0,
          size: res.data.size,
        });

      res.crustResponse = placeStorageRequestResponse;
      return res;
    }
  }

  async getFileOrDirectory(cid: string) {
    return await new StorageMicroservice().getObjectFromIPFS({ cid: cid });
  }

  async listDirectory(cid: string) {
    return await new StorageMicroservice().listIPFSDirectory({ cid: cid });
  }

  //#endregion
}

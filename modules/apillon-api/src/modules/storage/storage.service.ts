import { Injectable } from '@nestjs/common';
import { StorageMicroservice } from 'at-lib';
import { v4 as uuidv4 } from 'uuid';
import { ApillonApiContext } from '../../context';
import { UploadFilesToIPFSDto } from './dtos/upload-files-to-IPFS';

@Injectable()
export class StorageService {
  //#region storage microservice calls

  async uploadFilesToIPFS(
    ctx: ApillonApiContext,
    data: UploadFilesToIPFSDto,
  ): Promise<any> {
    // call microservice
    return await new StorageMicroservice(ctx).addFileToIPFS({
      files: data.files,
    });
  }

  async uploadFilesToIPFSFromS3(
    ctx: ApillonApiContext,
    data: any,
  ): Promise<any> {
    // call microservice
    const res = await new StorageMicroservice(ctx).addFileToIPFSFromS3({
      fileKey: data.fileKey,
    });

    if (res.success) {
      console.log('FIle successfully pushed to IPFS. Placing storage order...');
      const placeStorageRequestResponse = await new StorageMicroservice(
        ctx,
      ).placeStorageOrderToCRUST({
        cid: res.data.cidV0,
        size: res.data.size,
      });

      res.crustResponse = placeStorageRequestResponse;
      return res;
    }
  }

  async getFileOrDirectory(ctx: ApillonApiContext, cid: string) {
    return await new StorageMicroservice(ctx).getObjectFromIPFS({
      cid: cid,
    });
  }

  async listDirectory(ctx: ApillonApiContext, cid: string) {
    return await new StorageMicroservice(ctx).listIPFSDirectory({
      cid: cid,
    });
  }

  //#endregion
}

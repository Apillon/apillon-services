import {
  CreateS3SignedUrlForUploadDto,
  FileDetailsQueryFilter,
  StorageMicroservice,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class StorageService {
  async createS3SignedUrlForUpload(
    context: ApillonApiContext,
    body: CreateS3SignedUrlForUploadDto,
  ) {
    return (
      await new StorageMicroservice(context).requestS3SignedURLForUpload(body)
    ).data;
  }

  async getFileDetails(context: ApillonApiContext, cid: string) {
    const filter: FileDetailsQueryFilter = new FileDetailsQueryFilter(
      { cid: cid },
      context,
    );
    return (await new StorageMicroservice(context).getFileDetails(filter)).data;
  }

  //#region storage microservice calls

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
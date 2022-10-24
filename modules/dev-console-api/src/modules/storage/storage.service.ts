import { Injectable } from '@nestjs/common';
import { CreateS3SignedUrlForUploadDto, StorageMicroservice } from 'at-lib';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class StorageService {
  async createS3SignedUrlForUpload(
    context: DevConsoleApiContext,
    body: CreateS3SignedUrlForUploadDto,
  ) {
    return (
      await new StorageMicroservice(context).requestS3SignedURLForUpload(body)
    ).data;
  }
}

import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BadRequestErrorCode,
  CodeException,
  CreateS3SignedUrlForUploadDto,
  FileDetailsQueryFilter,
  StorageMicroservice,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
@Injectable()
export class StorageService {
  async endFileUploadSession(
    context: DevConsoleApiContext,
    session_uuid: string,
  ) {
    return (
      await new StorageMicroservice(
        context,
      ).endFileUploadSessionAndExecuteSyncToIPFS(session_uuid)
    ).data;
  }
  async createS3SignedUrlForUpload(
    context: DevConsoleApiContext,
    body: CreateS3SignedUrlForUploadDto,
  ) {
    return (
      await new StorageMicroservice(context).requestS3SignedURLForUpload(body)
    ).data;
  }

  async getFileDetails(
    context: DevConsoleApiContext,
    query: FileDetailsQueryFilter,
  ) {
    if (!query.file_uuid && !query.cid) {
      throw new CodeException({
        code: BadRequestErrorCode.INVALID_QUERY_PARAMETERS,
        status: HttpStatus.BAD_REQUEST,
        errorCodes: BadRequestErrorCode,
      });
    }

    return (await new StorageMicroservice(context).getFileDetails(query)).data;
  }
}

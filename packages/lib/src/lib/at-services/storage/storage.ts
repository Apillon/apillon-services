import { env } from '../../../config/env';
import {
  AppEnvironment,
  SerializeFor,
  StorageEventType,
} from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { BucketQueryFilter } from './dtos/bucket-query-filter.dto';
import { CreateBucketDto } from './dtos/create-bucket.dto';
import { CreateDirectoryDto } from './dtos/create-directory.dto';
import { CreateS3SignedUrlForUploadDto } from './dtos/create-s3-signed-url-for-upload.dto';
import { DirectoryContentQueryFilter } from './dtos/directory-content-query-filter.dto';
import { FileDetailsQueryFilter } from './dtos/file-details-query-filter.dto';

export class StorageMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.STORAGE_FUNCTION_NAME_TEST
      : env.STORAGE_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.STORAGE_SOCKET_PORT_TEST
      : env.STORAGE_SOCKET_PORT;
  serviceName = 'LMAS';

  user: any;

  constructor(context: Context) {
    super();
    this.isDefaultAsync = false;
    this.user = context.user;
  }

  //#region bucket CRUD

  public async listBuckets(params: BucketQueryFilter) {
    const data = {
      eventName: StorageEventType.LIST_BUCKETS,
      user: this.user.serialize(),
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async createBucket(params: CreateBucketDto) {
    const data = {
      eventName: StorageEventType.CREATE_BUCKET,
      user: this.user.serialize(),
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async updateBucket(params: { id: number; data: any }) {
    const data = {
      eventName: StorageEventType.UPDATE_BUCKET,
      user: this.user.serialize(),
      ...params,
    };
    return await this.callService(data);
  }

  public async deleteBucket(params: { id: number }) {
    const data = {
      eventName: StorageEventType.DELETE_BUCKET,
      user: this.user.serialize(),
      ...params,
    };
    return await this.callService(data);
  }

  //#endregion

  //#region Directory CRUD

  public async createDirectory(params: CreateDirectoryDto) {
    const data = {
      eventName: StorageEventType.CREATE_DIRECTORY,
      user: this.user.serialize(),
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async updateDirectory(params: { id: number; data: any }) {
    const data = {
      eventName: StorageEventType.UPDATE_DIRECTROY,
      user: this.user.serialize(),
      ...params,
    };
    return await this.callService(data);
  }

  public async deleteDirectory(params: { id: number }) {
    const data = {
      eventName: StorageEventType.DELETE_DIRECTORY,
      user: this.user.serialize(),
      ...params,
    };
    return await this.callService(data);
  }

  public async listDirectoryContent(params: DirectoryContentQueryFilter) {
    const data = {
      eventName: StorageEventType.LIST_DIRECTORY_CONTENT,
      user: this.user.serialize(),
      query: params.serialize(),
    };
    return await this.callService(data);
  }
  //#endregion

  //#region upload files to S3, IPFS & pin to crust

  public async requestS3SignedURLForUpload(
    params: CreateS3SignedUrlForUploadDto,
  ) {
    const data = {
      eventName: StorageEventType.REQUEST_S3_SIGNED_URL_FOR_UPLOAD,
      user: this.user?.serialize(),
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async endFileUploadSessionAndExecuteSyncToIPFS(session_uuid: string) {
    const data = {
      eventName: StorageEventType.END_FILE_UPLOAD_SESSION,
      user: this.user.serialize(),
      session_uuid: session_uuid,
    };
    return await this.callService(data);
  }

  //#endregion

  //#region file

  public async getFileDetails(params: FileDetailsQueryFilter) {
    const data = {
      eventName: StorageEventType.GET_FILE_DETAILS,
      user: this.user?.serialize(),
      file_uuid: params.file_uuid,
      cid: params.cid,
    };
    return await this.callService(data);
  }

  //#endregion

  public async addFileToIPFSFromS3(params: { fileKey: string }) {
    const data = {
      eventName: StorageEventType.ADD_FILE_TO_IPFS_FROM_S3,
      ...params,
    };
    return await this.callService(data);
  }

  public async addFileToIPFS(params: { files: any[] }) {
    const data = {
      eventName: StorageEventType.ADD_FILE_TO_IPFS,
      ...params,
    };
    return await this.callService(data);
  }

  public async getObjectFromIPFS(params: { cid: string }) {
    const data = {
      eventName: StorageEventType.GET_OBJECT_FROM_IPFS,
      ...params,
    };
    return await this.callService(data);
  }

  public async listIPFSDirectory(params: { cid: string }) {
    const data = {
      eventName: StorageEventType.LIST_IPFS_DIRECTORY,
      ...params,
    };
    console.info(data);
    return await this.callService(data);
  }

  public async placeStorageOrderToCRUST(params: { cid: string; size: number }) {
    const data = {
      eventName: StorageEventType.PLACE_STORAGE_ORDER_TO_CRUST,
      ...params,
    };
    console.info(data);
    return await this.callService(data);
  }
}

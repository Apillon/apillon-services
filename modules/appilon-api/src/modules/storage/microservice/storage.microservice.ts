import { AppEnvironment, env, StorageEventType } from 'at-lib';
import { BaseService } from 'at-lib/dist/lib/at-services/base-service';

export class StorageMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.AT_STORAGE_FUNCTION_NAME_TEST
      : env.AT_STORAGE_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.AT_STORAGE_SOCKET_PORT_TEST
      : env.AT_STORAGE_SOCKET_PORT;
  serviceName = 'LMAS';
  private securityToken: string;

  constructor() {
    super();
    this.isDefaultAsync = false;
  }

  public async addFileToIPFS(params: { files: any[] }) {
    const data = {
      eventName: StorageEventType.ADD_FILE_TO_IPFS,
      ...params,
    };
    return await this.callService(data);
  }

  public async addFileToIPFSFromS3(params: { fileKey: string }) {
    const data = {
      eventName: StorageEventType.ADD_FILE_TO_IPFS_FROM_S3,
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

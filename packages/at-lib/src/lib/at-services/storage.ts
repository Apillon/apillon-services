import { env } from '../../config/env';
import { AppEnvironment, StorageEventType } from '../../config/types';
import { BaseService } from './base-service';

/**
 * Logging / Monitoring / Alerting Service client
 */
export class Storage extends BaseService {
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

  public async addFileToIPFS(params: { data: any }) {
    const data = {
      eventName: StorageEventType.ADD_FILE_TO_IPFS,
      ...params,
    };
    await this.callService(data);
  }

  public async getObjectFromIPFS(params: { cid: string }) {
    const data = {
      eventName: StorageEventType.GET_OBJECT_FROM_IPFS,
      ...params,
    };
    await this.callService(data);
  }

  public async listIPFSDirectory(params: { cid: string }) {
    const data = {
      eventName: StorageEventType.LIST_IPFS_DIRECTORY,
      cid: params.cid,
    };
    console.info(data);
    await this.callService(data);
  }
}

import { env } from '../../../config/env';
import { AppEnvironment, InfrastructureEventType } from '../../../config/types';
import { BaseProjectQueryFilter } from '../../base-models/base-project-query-filter.model';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreateIndexerDto } from './dtos/create-indexer.dto';
import { CreateRpcApiKeyDto } from './dtos/create-rpc-api-key.dto';
import { CreateRpcUrlDto } from './dtos/create-rpc-url.dto';
import { IndexerLogsQueryFilter } from './dtos/indexer-logs-query-filter.dto';
import { ListRpcUrlsForApiKeyQueryFilter } from './dtos/list-rpc-urls-for-api-key-query-filter.dto';
import { UpdateRpcApiKeyDto } from './dtos/update-rpc-api-key.dto';
import { UpdateRpcUrlDto } from './dtos/update-rpc-url.dto';

export class InfrastructureMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.INFRASTRUCTURE_FUNCTION_NAME_TEST
      : env.INFRASTRUCTURE_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.INFRASTRUCTURE_SOCKET_PORT_TEST
      : env.INFRASTRUCTURE_SOCKET_PORT;
  serviceName: 'INFRASTRUCTURE';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  public async getRpcApiKeyUsage(id: number) {
    return await this.callService({
      eventName: InfrastructureEventType.GET_RPC_API_KEY_USAGE,
      id,
    });
  }
  public async listRpcApiKeys(filter: BaseProjectQueryFilter) {
    return await this.callService({
      eventName: InfrastructureEventType.LIST_RPC_API_KEYS,
      filter,
    });
  }
  public async createRpcApiKey(data: CreateRpcApiKeyDto) {
    return await this.callService({
      eventName: InfrastructureEventType.CREATE_RPC_API_KEY,
      data,
    });
  }

  public async updateRpcApiKey(id: number, data: UpdateRpcApiKeyDto) {
    return await this.callService({
      eventName: InfrastructureEventType.UPDATE_RPC_API_KEY,
      data: { id, data },
    });
  }
  public async revokeRpcApiKey(id: number) {
    return await this.callService({
      eventName: InfrastructureEventType.REVOKE_RPC_API_KEY,
      id,
    });
  }
  public async createRpcUrl(data: CreateRpcUrlDto) {
    return await this.callService({
      eventName: InfrastructureEventType.CREATE_RPC_URL,
      data,
    });
  }

  public async updateRpcUrl(id: number, data: UpdateRpcUrlDto) {
    return await this.callService({
      eventName: InfrastructureEventType.UPDATE_RPC_URL,
      id,
      data,
    });
  }
  public async deleteRpcUrl(id: number) {
    return await this.callService({
      eventName: InfrastructureEventType.DELETE_RPC_URL,
      id,
    });
  }
  public async listRpcUrlsForApiKey(query: ListRpcUrlsForApiKeyQueryFilter) {
    return await this.callService({
      eventName: InfrastructureEventType.LIST_RPC_URLS,
      query,
    });
  }

  //#region Indexer

  public async listIndexers(query: BaseProjectQueryFilter) {
    return await this.callService({
      eventName: InfrastructureEventType.INDEXER_LIST,
      query,
    });
  }

  public async getIndexer(indexer_uuid: string) {
    return await this.callService({
      eventName: InfrastructureEventType.INDEXER_GET,
      indexer_uuid,
    });
  }

  public async getIndexerLogs(
    indexer_uuid: string,
    query: IndexerLogsQueryFilter,
  ) {
    return await this.callService({
      eventName: InfrastructureEventType.INDEXER_GET,
      indexer_uuid,
      query: query.serialize(),
    });
  }

  public async createIndexer(data: CreateIndexerDto) {
    return await this.callService({
      eventName: InfrastructureEventType.INDEXER_CREATE,
      data,
    });
  }

  public async getUrlForSourceCodeUpload(indexer_uuid: string) {
    return await this.callService({
      eventName: InfrastructureEventType.INDEXER_GET_URL_FOR_SC_UPLOAD,
      indexer_uuid,
    });
  }

  public async deployIndexer(indexer_uuid: string) {
    return await this.callService({
      eventName: InfrastructureEventType.INDEXER_DEPLOY,
      indexer_uuid,
    });
  }

  //#endregion
}

import { env } from '../../../config/env';
import { AppEnvironment, InfrastructureEventType } from '../../../config/types';
import { BaseProjectQueryFilter } from '../../base-models/base-project-query-filter.model';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreateRpcEnvironmentDto } from './dtos/create-rpc-environment.dto';
import { CreateRpcUrlDto } from './dtos/create-rpc-url.dto';
import { ListRpcUrlsForEnvironmentQueryFilter } from './dtos/list-rpc-urls-for-environment-query-filter.dto';
import { UpdateRpcEnvironmentDto } from './dtos/update-rpc-environment.dto';
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

  public async getEnvironmentUsage(id: number) {
    return await this.callService({
      eventName: InfrastructureEventType.GET_RPC_ENVIRONMENT_USAGE,
      id,
    });
  }
  public async listRpcEnvironments(filter: BaseProjectQueryFilter) {
    return await this.callService({
      eventName: InfrastructureEventType.LIST_RPC_ENVIRONMENTS,
      filter,
    });
  }
  public async createRpcEnvironment(data: CreateRpcEnvironmentDto) {
    return await this.callService({
      eventName: InfrastructureEventType.CREATE_RPC_ENVIRONMENT,
      data,
    });
  }

  public async updateRpcEnvironment(id: number, data: UpdateRpcEnvironmentDto) {
    return await this.callService({
      eventName: InfrastructureEventType.UPDATE_RPC_ENVIRONMENT,
      data: { id, data },
    });
  }
  public async revokeRpcEnvironment(id: number) {
    return await this.callService({
      eventName: InfrastructureEventType.REVOKE_RPC_ENVIRONMENT,
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
  public async listRpcUrlsForEnvironment(
    query: ListRpcUrlsForEnvironmentQueryFilter,
  ) {
    return await this.callService({
      eventName: InfrastructureEventType.LIST_RPC_URLS,
      query,
    });
  }
}

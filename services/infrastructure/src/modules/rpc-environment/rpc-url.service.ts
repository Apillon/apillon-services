import { ServiceContext } from '@apillon/service-lib';
import { RpcUrl } from './rpc-url.model';
import {
  CreateRpcUrlDto,
  ListRpcUrlsForEnvironmentQueryFilter,
  ModelValidationException,
  SqlModelStatus,
  UpdateRpcUrlDto,
  ValidatorErrorCode,
  hasProjectAccess,
} from '@apillon/lib';
import { InfrastructureCodeException } from '../../lib/exceptions';
import { InfrastructureErrorCode } from '../../config/types';
import { RpcEnvironment } from './rpc-environment.model';
export class RpcUrlService {
  static async createRpcUrl(
    { data }: { data: CreateRpcUrlDto },
    context: ServiceContext,
  ) {
    const rpcEnvironment = await new RpcEnvironment({}, context).populateById(
      data.environmentId,
    );
    if (!rpcEnvironment.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_ENVIRONMENT_NOT_FOUND,
        status: 404,
      });
    }
    if (!hasProjectAccess(rpcEnvironment.projectUuid, context)) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.USER_IS_NOT_AUTHORIZED,
        status: 403,
      });
    }
    const rpcUrlByNetworkAndEnvironment = await new RpcUrl(
      {},
      context,
    ).populateByNetworkAndEnvironment(data.network, data.environmentId);
    if (rpcUrlByNetworkAndEnvironment.exists()) {
      return rpcUrlByNetworkAndEnvironment.serializeByContext();
    }
    const rpcUrl = new RpcUrl(data, context);
    // TO-DO fetch from dwellir
    rpcUrl.httpsUrl = 'https://example.com';
    rpcUrl.wssUrl = 'wss://example.com';
    return (await rpcUrl.insert()).serializeByContext();
  }
  static async updateRpcUrl(
    {
      id,
      data,
    }: {
      id: number;
      data: UpdateRpcUrlDto;
    },
    context: ServiceContext,
  ) {
    const rpcUrl = await new RpcUrl({}, context).populateByIdWithProject(id);
    if (!rpcUrl.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_URL_NOT_FOUND,
        status: 404,
      });
    }
    if (!hasProjectAccess(rpcUrl.projectUuid, context)) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.USER_IS_NOT_AUTHORIZED,
        status: 403,
      });
    }
    rpcUrl.populate(data);
    await rpcUrl.validateOrThrow(ModelValidationException, ValidatorErrorCode);
    await rpcUrl.update();
    return rpcUrl.serializeByContext();
  }
  static async deleteRpcUrl({ id }: { id: number }, context: ServiceContext) {
    const rpcUrl = await new RpcUrl({}, context).populateByIdWithProject(id);
    if (!rpcUrl.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_URL_NOT_FOUND,
        status: 404,
      });
    }
    if (!hasProjectAccess(rpcUrl.projectUuid, context)) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.USER_IS_NOT_AUTHORIZED,
        status: 403,
      });
    }
    await rpcUrl.updateStatus(SqlModelStatus.DELETED);
    return rpcUrl.serializeByContext();
  }
  static async listRpcUrls(
    event: {
      query: ListRpcUrlsForEnvironmentQueryFilter;
    },
    context: ServiceContext,
  ) {
    const environment = await new RpcEnvironment({}, context).populateById(
      event.query.environmentId,
    );
    if (!environment.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_ENVIRONMENT_NOT_FOUND,
        status: 404,
      });
    }
    if (!hasProjectAccess(environment.projectUuid, context)) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.USER_IS_NOT_AUTHORIZED,
        status: 403,
      });
    }
    const filter = new ListRpcUrlsForEnvironmentQueryFilter(
      event.query,
      context,
    );
    return await new RpcUrl({}, context).listForEnvironment(filter);
  }
}

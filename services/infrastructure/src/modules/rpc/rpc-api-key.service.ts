import { ServiceContext } from '@apillon/service-lib';
import { RpcApiKey } from './rpc-api-key.model';
import {
  BaseProjectQueryFilter,
  CreateRpcApiKeyDto,
  ModelValidationException,
  SqlModelStatus,
  UpdateRpcApiKeyDto,
  ValidatorErrorCode,
  hasProjectAccess,
} from '@apillon/lib';
import { InfrastructureCodeException } from '../../lib/exceptions';
import { InfrastructureErrorCode } from '../../config/types';
export class RpcApiKeyService {
  static async createRpcApiKey(
    { data }: { data: CreateRpcApiKeyDto },
    context: ServiceContext,
  ) {
    const rpcApiKey = new RpcApiKey(data, context);
    rpcApiKey.uuid = 'xyz'; // Will be fetched from dwellir in the future
    return await rpcApiKey.insert();
  }
  static async updateRpcApiKey(
    {
      data: { id, data },
    }: {
      data: {
        id: number;
        data: UpdateRpcApiKeyDto;
      };
    },
    context: ServiceContext,
  ) {
    const rpcApiKey = await new RpcApiKey({}, context).populateById(id);
    if (!rpcApiKey.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_API_KEY_NOT_FOUND,
        status: 404,
      });
    }
    if (!hasProjectAccess(rpcApiKey.projectUuid, context)) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.USER_IS_NOT_AUTHORIZED,
        status: 403,
      });
    }
    rpcApiKey.populate(data);
    await rpcApiKey.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );
    await rpcApiKey.update();
    return rpcApiKey.serialize();
  }
  static async revokeRpcApiKey(
    { id }: { id: number },
    context: ServiceContext,
  ) {
    const rpcApiKey = await new RpcApiKey({}, context).populateById(id);
    if (!rpcApiKey.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_API_KEY_NOT_FOUND,
        status: 404,
      });
    }
    if (!hasProjectAccess(rpcApiKey.projectUuid, context)) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.USER_IS_NOT_AUTHORIZED,
        status: 403,
      });
    }
    // TO-DO Revoke API Key on dwellir
    rpcApiKey.status = SqlModelStatus.DELETED;
    await rpcApiKey.update();
    return rpcApiKey.serialize();
  }
  static async listRpcApiKeys(
    event: {
      filter: BaseProjectQueryFilter;
    },
    context: ServiceContext,
  ) {
    const filter = new BaseProjectQueryFilter(event.filter, context);
    return await new RpcApiKey({}, context).listForProject(filter);
  }
}

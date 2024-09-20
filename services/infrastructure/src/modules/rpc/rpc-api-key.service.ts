import { ServiceContext } from '@apillon/service-lib';
import { RpcApiKey } from './rpc-api-key.model';
import {
  BaseProjectQueryFilter,
  CreateRpcApiKeyDto,
  Dwellir,
  ModelValidationException,
  SqlModelStatus,
  UpdateRpcApiKeyDto,
  ValidatorErrorCode,
  hasProjectAccess,
} from '@apillon/lib';
import { InfrastructureCodeException } from '../../lib/exceptions';
import { InfrastructureErrorCode } from '../../config/types';
export class RpcApiKeyService {
  static async getRpcApiKeyUsage(
    data: { data: { id: number; dwellirId: string } },
    context: ServiceContext,
  ) {
    const rpcApiKey = await new RpcApiKey({}, context).populateById(
      data.data.id,
    );

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
    const usages = await Dwellir.getUsage(data.data.dwellirId);
    const usagePerKey = usages.by_key[rpcApiKey.uuid];
    if (!usagePerKey) {
      return {
        responses: 0,
        requests: 0,
        per_method: {},
      };
    }
    return usagePerKey;
  }

  static async createRpcApiKey(
    { data }: { data: CreateRpcApiKeyDto },
    context: ServiceContext,
  ) {
    const dwellirUserId = data.dwellirUserId;
    const rpcApiKey = new RpcApiKey(data, context);
    const apiKeyResponse = data.triggerCreation
      ? await Dwellir.createApiKey(dwellirUserId)
      : await Dwellir.getInitialApiKey(dwellirUserId);
    rpcApiKey.uuid = apiKeyResponse.api_key;
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
    {
      data: { id, dwellirUserId },
    }: { data: { id: number; dwellirUserId: string } },
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
    await Dwellir.revokeApiKey(dwellirUserId, rpcApiKey.uuid);
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

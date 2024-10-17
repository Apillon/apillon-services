import { ServiceContext } from '@apillon/service-lib';
import { RpcApiKey } from './models/rpc-api-key.model';
import {
  BaseProjectQueryFilter,
  CreateRpcApiKeyDto,
  DwellirSubscription,
  ModelValidationException,
  QuotaCode,
  Scs,
  SerializeFor,
  SqlModelStatus,
  UpdateRpcApiKeyDto,
  ValidatorErrorCode,
  runWithWorkers,
} from '@apillon/lib';
import { InfrastructureCodeException } from '../../lib/exceptions';
import { InfrastructureErrorCode } from '../../config/types';
import { Dwellir } from '../../lib/dwellir/dwellir';
import { DwellirUser } from './models/dwelir-user.model';

export class RpcApiKeyService {
  static async createUser(
    { projectUuid }: { projectUuid: string },
    context: ServiceContext,
  ) {
    const createResponse = await RpcApiKeyService.getOrCreateDwellirId(context);

    if (createResponse.created) {
      const apiKeyResponse = await Dwellir.getInitialApiKey(
        createResponse.dwellirId,
      );
      const rpcApiKey = new RpcApiKey({}, context).populate({
        uuid: apiKeyResponse.api_key,
        name: 'Initial API Key',
        project_uuid: projectUuid,
      });

      await rpcApiKey.insert();
    }

    return createResponse;
  }

  static async getRpcApiKeyUsage(
    { id }: { id: number },
    context: ServiceContext,
  ) {
    const dwellirId = await RpcApiKeyService.getDwellirId(context);

    const rpcApiKey = await new RpcApiKey({}, context).populateById(id);

    if (!rpcApiKey.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_API_KEY_NOT_FOUND,
        status: 404,
      });
    }

    rpcApiKey.canAccess(context);

    const usages = await Dwellir.getUsage(dwellirId);
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

  static async getRpcApiKey({ id }: { id: number }, context: ServiceContext) {
    const rpcApiKey = await new RpcApiKey({}, context).populateById(id);

    if (!rpcApiKey.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_API_KEY_NOT_FOUND,
        status: 404,
      });
    }

    rpcApiKey.canAccess(context);
    return rpcApiKey.serialize(SerializeFor.PROFILE);
  }

  static async changeDwellirSubscription(
    { subscription }: { subscription: DwellirSubscription },
    context: ServiceContext,
  ) {
    const dwellirUserId = await this.getDwellirId(context);

    return await Dwellir.changeSubscription(dwellirUserId, subscription);
  }

  static async downgradeDwellirSubscriptionsByUserUuids(
    { user_uuids }: { user_uuids: string[] },
    context: ServiceContext,
  ) {
    const dwellirUsers = await new DwellirUser({}, context).populateByUserUuids(
      user_uuids,
    );

    const dwellirIds = dwellirUsers.map(
      (dwellirUser) => dwellirUser.dwellir_id,
    );

    await runWithWorkers(dwellirIds, 10, context, async (dwellirId) => {
      await Dwellir.changeSubscription(dwellirId, DwellirSubscription.FREE);
    });

    return true;
  }

  static async getOrCreateDwellirId(context: ServiceContext) {
    const dwellirUser = await new DwellirUser({}, context).populateById(
      context.user.id,
    );

    if (dwellirUser.exists()) {
      return {
        dwellirId: dwellirUser.dwellir_id,
        created: false,
      };
    }

    const responseBody = await Dwellir.createUser(context.user.email);

    const createdDwellirUser = new DwellirUser({}, context).populate({
      dwellir_id: responseBody.id,
      user_uuid: context.user.user_uuid,
      email: context.user.email,
    });

    await createdDwellirUser.insert();

    return {
      dwellirId: responseBody.id,
      userId: context.user.id,
      created: true,
    };
  }

  static async hasDwellirId(
    { userUuid }: { userUuid: string },
    context: ServiceContext,
  ) {
    const foundIds = await new DwellirUser({}, context).populateByUserUuids([
      userUuid,
    ]);

    return !!foundIds.length;
  }

  static async getDwellirId(context: ServiceContext) {
    const dwellirUser = await new DwellirUser({}, context).populateById(
      context.user.id,
    );

    if (!dwellirUser.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.DWELLIR_ID_NOT_FOUND,
        status: 404,
      });
    }

    return dwellirUser.dwellir_id;
  }

  static async createRpcApiKey(
    { data }: { data: CreateRpcApiKeyDto },
    context: ServiceContext,
  ) {
    const { dwellirId, created } =
      await RpcApiKeyService.getOrCreateDwellirId(context);

    if (!created) {
      const maxApiKeysQuota = await new Scs(context).getQuota({
        quota_id: QuotaCode.MAX_RPC_KEYS,
        object_uuid: context.user.user_uuid,
      });

      const keysCount = await new RpcApiKey({}, context).getNumberOfKeysPerUser(
        context.user.id,
      );

      if (keysCount >= maxApiKeysQuota.value) {
        throw new InfrastructureCodeException({
          code: InfrastructureErrorCode.MAX_RPC_KEYS_REACHED,
          status: 400,
        });
      }
    }

    const rpcApiKey = new RpcApiKey(data, context);
    const apiKeyResponse = !created
      ? await Dwellir.createApiKey(dwellirId)
      : await Dwellir.getInitialApiKey(dwellirId);
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

    rpcApiKey.canAccess(context);

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
    const dwellirUserId = await RpcApiKeyService.getDwellirId(context);

    const rpcApiKey = await new RpcApiKey({}, context).populateById(id);
    if (!rpcApiKey.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_API_KEY_NOT_FOUND,
        status: 404,
      });
    }

    rpcApiKey.canAccess(context);

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

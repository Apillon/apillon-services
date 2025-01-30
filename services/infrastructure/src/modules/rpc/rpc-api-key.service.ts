import { ServiceContext } from '@apillon/service-lib';
import { RpcApiKey } from './models/rpc-api-key.model';
import {
  ApillonApiCreateRpcApiKeyDto,
  BaseProjectQueryFilter,
  CreateRpcApiKeyDto,
  DwellirSubscription,
  Mailing,
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
    { data: { id, userUuid } }: { data: { id: number; userUuid: string } },
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

    const dwellirUser = await new DwellirUser({}, context).populateByUserUuid(
      userUuid,
    );

    if (!dwellirUser.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.DWELLIR_ID_NOT_FOUND,
        status: 404,
      });
    }

    const dwellirId = dwellirUser.dwellir_id;

    const usages = await Dwellir.getUsage(dwellirId);

    const totalResponses = usages.total_responses ?? 0;

    const totalRequests = usages.total_requests ?? 0;

    const usagePerKey = usages.by_key[rpcApiKey.uuid];
    if (!usagePerKey) {
      return {
        totalResponses,
        totalRequests,
        responses: 0,
        requests: 0,
        per_day: {},
      };
    }

    // Loop through all days and calculate the sum of requests and responses
    const calculatedUsage = Object.entries(usagePerKey).reduce(
      (acc, [_date, usage]) => {
        acc.requests += usage.requests;
        acc.responses += usage.responses;
        return acc;
      },
      { requests: 0, responses: 0 },
    );

    return {
      ...calculatedUsage,
      totalResponses,
      totalRequests,
      per_day: usagePerKey,
    };
  }

  static async getRpcApiKeyUsagePerChain(
    { data: { id, userUuid } }: { data: { id: number; userUuid: string } },
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

    const dwellirUser = await new DwellirUser({}, context).populateByUserUuid(
      userUuid,
    );

    if (!dwellirUser.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.DWELLIR_ID_NOT_FOUND,
        status: 404,
      });
    }

    const dwellirId = dwellirUser.dwellir_id;

    const usages = await Dwellir.getUsageV2(dwellirId);

    const usagePerDomain = usages.rows.reduce(
      (acc, usage) => {
        if (usage.api_key !== rpcApiKey.uuid) {
          return acc;
        }

        if (!acc[usage.domain]) {
          acc[usage.domain] = [
            {
              date: usage.datetime,
              requests: usage.requests,
              responses: usage.responses,
            },
          ];
        } else {
          const existingUsage = acc[usage.domain].find(
            (u) => u.date === usage.datetime,
          );
          if (existingUsage) {
            existingUsage.requests += usage.requests;
            existingUsage.responses += usage.responses;
          } else {
            acc[usage.domain].push({
              date: usage.datetime,
              requests: usage.requests,
              responses: usage.responses,
            });
          }
        }

        return acc;
      },
      {} as Record<
        string,
        { date: string; requests: number; responses: number }[]
      >,
    );

    // Sort the usage per domain by date
    Object.values(usagePerDomain).forEach((usages) => {
      usages.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    });

    return usagePerDomain;
  }

  static async getRpcApiKey({ id }: { id: number }, context: ServiceContext) {
    const rpcApiKey = await new RpcApiKey({}, context).populateByIdWithUrls(id);

    if (!rpcApiKey.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_API_KEY_NOT_FOUND,
        status: 404,
      });
    }

    rpcApiKey.canAccess(context);
    return rpcApiKey.serialize(SerializeFor.APILLON_API);
  }

  static async changeDwellirSubscription(
    {
      data: { subscription, userUuid },
    }: { data: { subscription: DwellirSubscription; userUuid: string } },
    context: ServiceContext,
  ) {
    const dwellirUser = await new DwellirUser({}, context).populateByUserUuid(
      userUuid,
    );

    if (!dwellirUser.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.DWELLIR_ID_NOT_FOUND,
        status: 404,
      });
    }

    return await Dwellir.changeSubscription(
      dwellirUser.dwellir_id,
      subscription,
    );
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

  static async getOrCreateDwellirId(
    context: ServiceContext,
    uuid?: string,
    email?: string,
  ) {
    const userUuid = uuid ?? context.user.user_uuid;
    const userEmail = email ?? context.user.email;

    const dwellirUser = await new DwellirUser({}, context).populateByUserUuid(
      userUuid,
    );

    if (dwellirUser.exists()) {
      return {
        dwellirId: dwellirUser.dwellir_id,
        created: false,
      };
    }

    const responseBody = await Dwellir.createUser(userEmail);

    const createdDwellirUser = new DwellirUser({}, context).populate({
      dwellir_id: responseBody.id,
      user_uuid: userUuid,
      email: userEmail,
    });

    await createdDwellirUser.insert();

    return {
      dwellirId: responseBody.id,
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
    const dwellirUser = await new DwellirUser({}, context).populateByUserUuid(
      context.user.user_uuid,
    );

    if (!dwellirUser.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.DWELLIR_ID_NOT_FOUND,
        status: 404,
      });
    }

    return dwellirUser.dwellir_id;
  }

  static async isRpcApiKeysQuotaReached(
    _data: unknown,
    context: ServiceContext,
  ) {
    const maxApiKeysQuota = await new Scs(context).getQuota({
      quota_id: QuotaCode.MAX_RPC_KEYS,
      object_uuid: context.user.user_uuid,
    });

    const keysCount = await new RpcApiKey({}, context).getNumberOfKeysPerUser(
      context.user.id,
    );

    return keysCount >= maxApiKeysQuota.value;
  }

  static async createRpcApiKey(
    { data }: { data: CreateRpcApiKeyDto | ApillonApiCreateRpcApiKeyDto },
    context: ServiceContext,
  ) {
    const userEmail = data['email'];
    const { dwellirId, created } = await RpcApiKeyService.getOrCreateDwellirId(
      context,
      data['user_uuid'],
      userEmail,
    );

    if (!created) {
      const maxApiKeysQuota = await new Scs(context).getQuota({
        quota_id: QuotaCode.MAX_RPC_KEYS,
        object_uuid: data['user_uuid'] ?? context.user.user_uuid,
      });

      const keysCount = await new RpcApiKey({}, context).getNumberOfKeysPerUser(
        data['user_id'] ?? context.user.id,
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
    const newRpcApiKey = (await rpcApiKey.insert()).serialize(
      SerializeFor.SERVICE,
    );

    // Set mailerlite field indicating the user created an RPC key
    new Mailing(context).setMailerliteField('has_rpc', true, userEmail);

    return newRpcApiKey;
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

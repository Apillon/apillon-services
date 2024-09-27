import { ServiceContext } from '@apillon/service-lib';
import { RpcUrl } from './models/rpc-url.model';
import {
  CreateRpcUrlDto,
  ListRpcUrlsForApiKeyQueryFilter,
  ModelValidationException,
  SqlModelStatus,
  UpdateRpcUrlDto,
  ValidatorErrorCode,
  hasProjectAccess,
} from '@apillon/lib';
import { InfrastructureCodeException } from '../../lib/exceptions';
import { InfrastructureErrorCode } from '../../config/types';
import { RpcApiKey } from './models/rpc-api-key.model';
import { Dwellir } from '../../lib/dwellir/dwellir';

export class RpcUrlService {
  static async createRpcUrl(
    { data }: { data: CreateRpcUrlDto },
    context: ServiceContext,
  ) {
    const rpcApiKey = await new RpcApiKey({}, context).populateById(
      data.apiKeyId,
    );
    if (!rpcApiKey.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_API_KEY_NOT_FOUND,
        status: 404,
      });
    }
    if (!hasProjectAccess(rpcApiKey.project_uuid, context)) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.USER_IS_NOT_AUTHORIZED,
        status: 403,
      });
    }
    const rpcUrlByNetworkAndApiKey = await new RpcUrl(
      {},
      context,
    ).populateByNetworkAndApiKey(data.network, data.apiKeyId);
    if (rpcUrlByNetworkAndApiKey.exists()) {
      return rpcUrlByNetworkAndApiKey.serializeByContext();
    }
    const rpcUrl = new RpcUrl(data, context);

    const endpoints = await Dwellir.getEndpoints();

    const rpcChain = endpoints.find((e) => e.name === data.chainName);

    if (!rpcChain) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_URL_CHAIN_NOT_FOUND,
        status: 404,
      });
    }

    const rpcNetwork = rpcChain.networks.find(
      (network) => network.name === data.network,
    );

    if (!rpcNetwork) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_URL_NETWORK_NOT_FOUND,
        status: 404,
      });
    }

    // To-DO check if we need to pick specific node type
    const node = rpcNetwork.nodes.find((node) => node.https && node.wss);

    if (!node) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_URL_URLS_NOT_PRESENT,
        status: 422,
      });
    }

    rpcUrl.httpsUrl = `${node.https}/${rpcApiKey.uuid}`;
    rpcUrl.wssUrl = `${node.wss}/${rpcApiKey.uuid}`;
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
    if (!hasProjectAccess(rpcUrl.project_uuid, context)) {
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
    if (!hasProjectAccess(rpcUrl.project_uuid, context)) {
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
      query: ListRpcUrlsForApiKeyQueryFilter;
    },
    context: ServiceContext,
  ) {
    const apiKey = await new RpcApiKey({}, context).populateById(
      event.query.apiKeyId,
    );
    if (!apiKey.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_API_KEY_NOT_FOUND,
        status: 404,
      });
    }
    if (!hasProjectAccess(apiKey.project_uuid, context)) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.USER_IS_NOT_AUTHORIZED,
        status: 403,
      });
    }
    const filter = new ListRpcUrlsForApiKeyQueryFilter(event.query, context);
    return await new RpcUrl({}, context).listForApiKey(filter);
  }
}

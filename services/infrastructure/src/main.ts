import { Context } from 'aws-lambda/handler';
import { InfrastructureEventType } from '@apillon/lib';
import { RpcApiKeyService } from './modules/rpc/rpc-api-key.service';
import { RpcUrlService } from './modules/rpc/rpc-url.service';
import { IndexerService } from './modules/indexer/indexer.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [InfrastructureEventType.CREATE_RPC_API_KEY]:
      RpcApiKeyService.createRpcApiKey,
    [InfrastructureEventType.UPDATE_RPC_API_KEY]:
      RpcApiKeyService.updateRpcApiKey,
    [InfrastructureEventType.REVOKE_RPC_API_KEY]:
      RpcApiKeyService.revokeRpcApiKey,
    [InfrastructureEventType.LIST_RPC_API_KEYS]:
      RpcApiKeyService.listRpcApiKeys,
    [InfrastructureEventType.GET_RPC_API_KEY_USAGE]:
      RpcApiKeyService.getRpcApiKeyUsage,
    [InfrastructureEventType.CREATE_RPC_URL]: RpcUrlService.createRpcUrl,
    [InfrastructureEventType.UPDATE_RPC_URL]: RpcUrlService.updateRpcUrl,
    [InfrastructureEventType.LIST_RPC_URLS]: RpcUrlService.listRpcUrls,
    [InfrastructureEventType.DELETE_RPC_URL]: RpcUrlService.deleteRpcUrl,

    [InfrastructureEventType.INDEXER_CREATE]: IndexerService.createIndexer,
    [InfrastructureEventType.INDEXER_GET]: IndexerService.getIndexer,
    [InfrastructureEventType.INDEXER_GET_LOGS]: IndexerService.getIndexerLogs,
    [InfrastructureEventType.INDEXER_GET_DEPLOYMENTS]:
      IndexerService.getIndexerDeployments,
    [InfrastructureEventType.INDEXER_LIST]: IndexerService.listIndexers,
    [InfrastructureEventType.INDEXER_GET_URL_FOR_SC_UPLOAD]:
      IndexerService.getUrlForSourceCodeUpload,
    [InfrastructureEventType.INDEXER_DEPLOY]: IndexerService.deployIndexer,
  };
  return await processors[event.eventName](event, context);
}

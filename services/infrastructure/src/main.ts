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
    [InfrastructureEventType.GET_RPC_API_KEY]: RpcApiKeyService.getRpcApiKey,
    [InfrastructureEventType.HAS_DWELLIR_ID]: RpcApiKeyService.hasDwellirId,
    [InfrastructureEventType.CHANGE_DWELLIR_SUBSCRIPTION]:
      RpcApiKeyService.changeDwellirSubscription,
    [InfrastructureEventType.DOWNGRADE_DWELLIR_SUBSCRIPTIONS]:
      RpcApiKeyService.downgradeDwellirSubscriptionsByUserUuids,
    [InfrastructureEventType.CREATE_RPC_URL]: RpcUrlService.createRpcUrl,
    [InfrastructureEventType.LIST_RPC_URLS]: RpcUrlService.listRpcUrls,
    [InfrastructureEventType.LIST_ENDPOINTS]: RpcUrlService.getEndpoints,
    [InfrastructureEventType.DELETE_RPC_URL]: RpcUrlService.deleteRpcUrl,

    [InfrastructureEventType.INDEXER_CREATE]: IndexerService.createIndexer,
    [InfrastructureEventType.INDEXER_GET]: IndexerService.getIndexer,
    [InfrastructureEventType.INDEXER_UPDATE]: IndexerService.updateIndexer,
    [InfrastructureEventType.INDEXER_GET_LOGS]: IndexerService.getIndexerLogs,
    [InfrastructureEventType.INDEXER_GET_DEPLOYMENTS]:
      IndexerService.getIndexerDeployments,
    [InfrastructureEventType.INDEXER_LIST]: IndexerService.listIndexers,
    [InfrastructureEventType.INDEXER_GET_URL_FOR_SC_UPLOAD]:
      IndexerService.getUrlForSourceCodeUpload,
    [InfrastructureEventType.INDEXER_DEPLOY]: IndexerService.deployIndexer,
    [InfrastructureEventType.INDEXER_HIBERNATE]:
      IndexerService.hibernateIndexer,
    [InfrastructureEventType.INDEXER_DELETE]: IndexerService.deleteIndexer,
  };
  return await processors[event.eventName](event, context);
}

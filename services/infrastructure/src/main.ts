import { Context } from 'aws-lambda/handler';
import { InfrastructureEventType } from '@apillon/lib';
import { RpcApiKeyService } from './modules/rpc/rpc-api-key.service';
import { RpcUrlService } from './modules/rpc/rpc-url.service';

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
    [InfrastructureEventType.CHANGE_DWELLIR_SUBSCRIPTION]:
      RpcApiKeyService.changeDwellirSubscription,
    [InfrastructureEventType.DOWNGRADE_DWELLIR_SUBSCRIPTIONS]:
      RpcApiKeyService.downgradeDwellirSubscriptionsByUserUuids,
    [InfrastructureEventType.CREATE_RPC_URL]: RpcUrlService.createRpcUrl,
    [InfrastructureEventType.UPDATE_RPC_URL]: RpcUrlService.updateRpcUrl,
    [InfrastructureEventType.LIST_RPC_URLS]: RpcUrlService.listRpcUrls,
    [InfrastructureEventType.DELETE_RPC_URL]: RpcUrlService.deleteRpcUrl,
  };
  return await processors[event.eventName](event, context);
}

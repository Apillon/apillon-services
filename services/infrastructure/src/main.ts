import { Context } from 'aws-lambda/handler';
import { InfrastructureEventType } from '@apillon/lib';
import { RpcEnvironmentService } from './modules/rpc-environment/rpc-environment.service';
import { RpcUrlService } from './modules/rpc-environment/rpc-url.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [InfrastructureEventType.CREATE_RPC_ENVIRONMENT]:
      RpcEnvironmentService.createRpcEnvironment,
    [InfrastructureEventType.UPDATE_RPC_ENVIRONMENT]:
      RpcEnvironmentService.updateRpcEnvironment,
    [InfrastructureEventType.REVOKE_RPC_ENVIRONMENT]:
      RpcEnvironmentService.revokeRpcEnvironment,
    [InfrastructureEventType.LIST_RPC_ENVIRONMENTS]:
      RpcEnvironmentService.listRpcEnvironments,
    [InfrastructureEventType.CREATE_RPC_URL]: RpcUrlService.createRpcUrl,
    [InfrastructureEventType.UPDATE_RPC_URL]: RpcUrlService.updateRpcUrl,
    [InfrastructureEventType.LIST_RPC_URLS]: RpcUrlService.listRpcUrls,
    [InfrastructureEventType.DELETE_RPC_URL]: RpcUrlService.deleteRpcUrl,
  };
  return await processors[event.eventName](event, context);
}

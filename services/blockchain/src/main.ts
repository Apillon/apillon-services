import { BlockchainEventType } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { SubstrateService } from './modules/substrate/substrate.service';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
  const processors = {
    [BlockchainEventType.SUBSTRATE_SIGN_TRANSACTION]:
      SubstrateService.createTransaction,
    [BlockchainEventType.SUBSTRATE_GET_TRANSACTION]:
      SubstrateService.getTransactionById,
  };

  return await processors[event.eventName](event, context);
}

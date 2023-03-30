import { ServiceContext } from './context';
import { BlockchainEventType } from '@apillon/lib';
import { SubstrateService } from './modules/substrate/substrate.service';

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

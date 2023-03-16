import { ServiceContext } from './context';
import { BlockchainEventType } from '@apillon/lib';
import { SubstrateService } from './modules/substrate/substrate.service';

export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
  const processors = {
    [BlockchainEventType.SIGN_SUBSTRATE_TRANSACTION]:
      SubstrateService.createTransaction,
  };

  return await processors[event.eventName](event, context);
}

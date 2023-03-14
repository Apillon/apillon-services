import { ServiceContext } from './context';
import { BlockchainEventType } from '@apillon/lib';
import { PolkadotService } from './modules/polkadot-signer/polkadot.service';

export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
  const processors = {
    [BlockchainEventType.SIGN_POLKADOT_TRANSACTION]:
      PolkadotService.createTransaction,
  };

  return await processors[event.eventName](event, context);
}

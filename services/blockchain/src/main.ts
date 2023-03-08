import { ServiceContext } from './context';
import { BlockchainEventType } from '@apillon/lib';
import { PolkadotService } from './modules/polkadot/polkadot.service';

export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
  const processors = {
    [BlockchainEventType.SIGN_POLKADOT_TRANSACTION]:
      PolkadotService.signTransaction,
  };

  return await processors[event.eventName](event, context);
}

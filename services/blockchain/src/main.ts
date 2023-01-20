import { ServiceContext } from './context';
import { BlockchainEventType } from '@apillon/lib';
import { PolkadotSignerService } from './modules/polkadot-signer/polkadot-signer.service';

export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
  const processors = {
    [BlockchainEventType.SIGN_POLKADOT_TRANSACTION]:
      PolkadotSignerService.signTransaction,
  };

  return await processors[event.eventName](event, context);
}

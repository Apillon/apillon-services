import { BlockchainEventType } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { EvmService } from './modules/evm/evm.service';
import { SubstrateService } from './modules/substrate/substrate.service';
import { CommonService } from './modules/common/common.service';
import { WalletService } from './modules/wallet/wallet.service';

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
    [BlockchainEventType.EVM_SIGN_TRANSACTION]: EvmService.createTransaction,
    [BlockchainEventType.EVM_GET_TRANSACTION]: EvmService.getTransactionById,
    [BlockchainEventType.GET_CHAIN_ENDPOINT]: CommonService.getChainEndpoint,
    [BlockchainEventType.LIST_WALLETS]: WalletService.listWallets,
    [BlockchainEventType.GET_WALLET]: WalletService.getWallet,
    [BlockchainEventType.GET_WALLET_TRANSACTIONS]:
      WalletService.getWalletTransactions,
  };

  return await processors[event.eventName](event, context);
}

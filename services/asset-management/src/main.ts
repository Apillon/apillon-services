import {
  AssetManagementEventType,
  AssetManagementMSEventType,
  BlockchainMicroservice,
  Lmas,
} from '@apillon/lib';
import { AssetManagementController } from './modules/asset-management/asset-management.controller';
import { ServiceContext } from '@apillon/service-lib';
import { WalletRefillService } from './modules/asset-management/services/wallet-refill.service';
import { TransactionRepository } from './modules/asset-management/repository/transaction-repository';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(
  event: AssetManagementMSEventType,
  context: ServiceContext,
): Promise<any> {
  const blockchainMicroservice = new BlockchainMicroservice(context);
  const logging = new Lmas();
  const walletRefillService = new WalletRefillService(
    context,
    blockchainMicroservice,
    logging,
  );
  const controller = new AssetManagementController(
    context,
    walletRefillService,
    blockchainMicroservice,
    logging,
    new TransactionRepository(context),
  );

  switch (event.eventName) {
    case AssetManagementEventType.REFILL_WALLET:
      return controller.refillWallet(event.body);
    case AssetManagementEventType.REFILL_WALLET_CONFIRM:
      return controller.refillWalletConfirm(event.body);
    case AssetManagementEventType.REFILL_WALLET_CANCEL:
      return controller.refillWalletCancel(event.body);
    case AssetManagementEventType.LIST_TRANSACTIONS:
      return controller.listWalletRefillTransactions(event.body);
    default:
      throw new Error('Invalid Asset Management Event Type');
  }
}

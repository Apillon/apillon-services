import { AssetManagementEventType } from '../../../config/types';
import { WalletRefillTransactionQueryFilter } from './dtos/transaction-query-filter.dto';
import { RefillWalletRequestDto } from './dtos/refill-wallet-request.dto';
import { RefillWalletDto } from '@apillon/blockchain-lib/common';

interface IAssetManagementMSEventBase {
  eventName: AssetManagementEventType;
}

interface IAssetManagementBodyEvent<T extends AssetManagementEventType, U>
  extends IAssetManagementMSEventBase {
  eventName: T;
  body: U;
}

export type AssetManagementMSEventType =
  | IAssetManagementBodyEvent<
      AssetManagementEventType.REFILL_WALLET,
      RefillWalletDto
    >
  | IAssetManagementBodyEvent<
      AssetManagementEventType.REFILL_WALLET_CONFIRM,
      RefillWalletRequestDto
    >
  | IAssetManagementBodyEvent<
      AssetManagementEventType.REFILL_WALLET_CANCEL,
      RefillWalletRequestDto
    >
  | IAssetManagementBodyEvent<
      AssetManagementEventType.LIST_TRANSACTIONS,
      WalletRefillTransactionQueryFilter
    >;

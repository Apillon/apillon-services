import {
  AssetManagementEventType,
  RefillWalletRequestDto,
  WalletRefillTransactionQueryFilter,
} from '../../..';
import { env } from '../../../config/env';
import { AppEnvironment } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { RefillWalletDto } from '@apillon/blockchain-lib/common';

export class AssetManagementMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.ASSET_MANAGEMENT_FUNCTION_NAME_TEST
      : env.ASSET_MANAGEMENT_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.ASSET_MANAGEMENT_SOCKET_PORT_TEST
      : env.ASSET_MANAGEMENT_SOCKET_PORT;
  serviceName = 'ASSET_MANAGEMENT';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  async refillWallet(body: RefillWalletDto) {
    return await this.callService({
      eventName: AssetManagementEventType.REFILL_WALLET,
      body,
    });
  }

  async refillWalletConfirm(body: RefillWalletRequestDto) {
    return await this.callService({
      eventName: AssetManagementEventType.REFILL_WALLET_CONFIRM,
      body,
    });
  }

  async refillWalletCancel(body: RefillWalletRequestDto) {
    return await this.callService({
      eventName: AssetManagementEventType.REFILL_WALLET_CANCEL,
      body,
    });
  }

  async listWalletRefillTransactions(body: WalletRefillTransactionQueryFilter) {
    return await this.callService({
      eventName: AssetManagementEventType.LIST_TRANSACTIONS,
      body,
    });
  }
}

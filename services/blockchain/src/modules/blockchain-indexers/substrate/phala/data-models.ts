import { BaseTransaction } from '../base-transaction-model';
import { BaseContractTransaction } from '../base-contract-transaction-model';

export interface PhatContractsInstantiatingTransaction
  extends BaseContractTransaction {
  readonly cluster?: string | undefined;
}

export interface PhatContractTransfer extends BaseTransaction {
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly clusterId?: string | undefined;
}
export interface PhatContractsInstantiatedTransaction extends BaseTransaction {
  readonly account?: string | undefined;
  readonly cluster?: string | undefined;
  readonly contract?: string | undefined;
  readonly deployer?: string | undefined;
}

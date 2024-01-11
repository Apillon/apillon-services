import { BaseTransaction } from '../base-transaction-model';

export interface PhatContractsInstantiatingTransaction extends BaseTransaction {
  readonly account?: string | undefined;
  readonly cluster?: string | undefined;
  readonly contract?: string | undefined;
}

export interface ClusterTransferTransaction extends BaseTransaction {
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

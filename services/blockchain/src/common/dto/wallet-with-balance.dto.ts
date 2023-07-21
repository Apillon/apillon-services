import { Wallet } from './../models/wallet';

export type WalletBalanceData = {
  balance: string;
  minBalance: string;
  isBelowThreshold: boolean;
};

export type WalletTransactionSumData = {
  totalFeeTransaction: number;
  totalAmountDeposit: number;
  totalAmountTransaction: number;
  totalPriceDeposit: number;
  totalPriceTransaction: number;
  totalValueDeposit: number;
  totalValueTransaction: number;
};

export type WalletWithBalanceDto = Wallet &
  WalletTransactionSumData &
  WalletBalanceData;

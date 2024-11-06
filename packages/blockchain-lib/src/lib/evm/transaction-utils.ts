import { ethers } from 'ethers';

export class TransactionUtils {
  static convertGweiToBase(value: number) {
    return ethers.utils.formatUnits(value, 'gwei');
  }

  static convertBaseToGwei(value: number) {
    return ethers.utils.parseUnits(value.toString(), 'ether');
  }
}

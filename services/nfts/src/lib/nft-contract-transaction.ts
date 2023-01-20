import { ContractFactory } from 'ethers';
import { PayableNft } from './contracts/payable-mint-nft';

export function createTransaction() {
  return new ContractFactory(PayableNft.abi, PayableNft.bytecode);
}

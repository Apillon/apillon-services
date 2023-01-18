import { ContractFactory } from 'ethers';
import { PayableNft } from './contracts/payable-mint-nft';

export function getNftContractFactory() {
  return new ContractFactory(PayableNft.abi, PayableNft.bytecode);
}

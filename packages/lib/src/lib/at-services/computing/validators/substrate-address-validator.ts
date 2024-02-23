import { ChainPrefix } from '../../substrate/constants/chain-prefix';
import { checkAddress } from '@polkadot/util-crypto';
import { SchrodingerContractData } from '../dtos/create-contract.dto';
import { ComputingContractType } from '../../../../config/types';
import { isEVMWallet } from '../../../utils';

export function substrateAddressValidator(chainPrefix: ChainPrefix) {
  return function (this: any, address: string): boolean {
    try {
      const [isValid] = checkAddress(address, chainPrefix);

      return isValid;
    } catch (e: any) {
      return false;
    }
  };
}

export function computingContractDataValidator() {
  return function (this: any, data: SchrodingerContractData): boolean {
    switch (this.contractType) {
      case ComputingContractType.SCHRODINGER:
        return (
          !!data.nftChainRpcUrl &&
          !!data.nftContractAddress &&
          isEVMWallet(data.nftContractAddress)
        );
      default:
        return true;
    }
  };
}

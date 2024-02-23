import { ChainPrefix } from '../../substrate/constants/chain-prefix';
import { checkAddress } from '@polkadot/util-crypto';
import { ComputingContractType } from '../../../../config/types';
import { SchrodingerContractDataDto } from '../dtos/schrodinger-contract-data-dto';

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
  return async function (
    this: any,
    data: SchrodingerContractDataDto,
  ): Promise<boolean> {
    switch (this.contractType) {
      case ComputingContractType.SCHRODINGER:
        const dto = new SchrodingerContractDataDto(data);
        await dto.validate({ quiet: true });
        return dto.isValid();
      default:
        return true;
    }
  };
}

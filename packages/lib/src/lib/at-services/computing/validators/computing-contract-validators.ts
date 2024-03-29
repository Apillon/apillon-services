import { ComputingContractType } from '../../../../config/types';
import { SchrodingerContractDataDto } from '../dtos/schrodinger-contract-data-dto';

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

import { BaseQueryFilter, SerializeFor } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { BlockchainErrorCode } from '../../config/types';
import { BlockchainCodeException } from '../../lib/exceptions';
import { Contract } from './contract.model';

export class ContractService {
  static async listContracts(
    filter: BaseQueryFilter,
    context: ServiceContext,
  ): Promise<{ items: any[]; total: number }> {
    return await new Contract({}, context).getList(filter);
  }

  static async getContract(
    { contractId }: { contractId: number },
    context: ServiceContext,
  ): Promise<any> {
    const contract = await new Contract({}, context).populateById(contractId);
    if (!contract.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.CONTRACT_NOT_FOUND,
        status: 404,
      });
    }
    return contract.serialize(SerializeFor.SERVICE);
  }
}

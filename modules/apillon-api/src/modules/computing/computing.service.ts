import {
  AssignCidToNft,
  ComputingMicroservice,
  ComputingTransactionQueryFilter,
  ContractQueryFilter,
  CreateContractDto,
  EncryptContentDto,
  TransferOwnershipDto,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class ComputingService {
  async createContract(context: ApillonApiContext, body: CreateContractDto) {
    return (await new ComputingMicroservice(context).createContract(body)).data;
  }

  async listContracts(context: ApillonApiContext, query: ContractQueryFilter) {
    return (await new ComputingMicroservice(context).listContracts(query)).data;
  }

  async getContract(context: ApillonApiContext, uuid: string) {
    return (await new ComputingMicroservice(context).getContract(uuid)).data;
  }

  async listTransactions(
    context: ApillonApiContext,
    query: ComputingTransactionQueryFilter,
  ) {
    return (await new ComputingMicroservice(context).listTransactions(query))
      .data;
  }

  async transferContractOwnership(
    context: ApillonApiContext,
    body: TransferOwnershipDto,
  ) {
    return (
      await new ComputingMicroservice(context).transferContractOwnership(body)
    ).data;
  }

  async encryptContent(context: ApillonApiContext, body: EncryptContentDto) {
    return (await new ComputingMicroservice(context).encryptContent(body)).data;
  }

  async assignCidToNft(context: ApillonApiContext, body: AssignCidToNft) {
    return (await new ComputingMicroservice(context).assignCidToNft(body)).data;
  }
}

import {
  AssignCidToNft,
  AttachedServiceType,
  ComputingMicroservice,
  ComputingTransactionQueryFilter,
  ContractQueryFilter,
  CreateContractDto,
  EncryptContentDto,
} from '@apillon/lib';
import { TransferOwnershipDto } from '@apillon/blockchain-lib/common';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { ServicesService } from '../services/services.service';

@Injectable()
export class ComputingService {
  constructor(private readonly serviceService: ServicesService) {}

  async createContract(context: DevConsoleApiContext, body: CreateContractDto) {
    await this.serviceService.createServiceIfNotExists(
      context,
      body.project_uuid,
      AttachedServiceType.CONTRACTS,
    );

    return (await new ComputingMicroservice(context).createContract(body)).data;
  }

  async listContracts(
    context: DevConsoleApiContext,
    query: ContractQueryFilter,
  ) {
    return (await new ComputingMicroservice(context).listContracts(query)).data;
  }

  async getContract(context: DevConsoleApiContext, uuid: string) {
    return (await new ComputingMicroservice(context).getContract(uuid)).data;
  }

  async archiveContract(context: DevConsoleApiContext, uuid: string) {
    return (await new ComputingMicroservice(context).archiveContract(uuid))
      .data;
  }

  async activateContract(context: DevConsoleApiContext, uuid: string) {
    return (await new ComputingMicroservice(context).activateContract(uuid))
      .data;
  }

  async listTransactions(
    context: DevConsoleApiContext,
    query: ComputingTransactionQueryFilter,
  ) {
    return (await new ComputingMicroservice(context).listTransactions(query))
      .data;
  }

  async transferContractOwnership(
    context: DevConsoleApiContext,
    body: TransferOwnershipDto,
  ) {
    return (
      await new ComputingMicroservice(context).transferContractOwnership(body)
    ).data;
  }

  async encryptContent(context: DevConsoleApiContext, body: EncryptContentDto) {
    return (await new ComputingMicroservice(context).encryptContent(body)).data;
  }

  async assignCidToNft(context: DevConsoleApiContext, body: AssignCidToNft) {
    return (await new ComputingMicroservice(context).assignCidToNft(body)).data;
  }
}

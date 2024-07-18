import {
  ApillonApiCallContractDTO,
  ApillonApiContractAbiQueryDTO,
  ApillonApiContractsQueryFilterDTO,
  ApillonApiContractTransactionQueryFilterDTO,
  ApillonApiCreateContractDTO,
  ApillonApiDeployedContractsQueryFilterDTO,
  ContractsMicroservice,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class ContractsService {
  //#region ------------- CONTRACTS ------------
  async listContracts(
    context: ApillonApiContext,
    query: ApillonApiContractsQueryFilterDTO,
  ) {
    return (await new ContractsMicroservice(context).listContracts(query)).data;
  }

  async getContract(context: ApillonApiContext, uuid: string) {
    return (await new ContractsMicroservice(context).getContract(uuid)).data;
  }

  async getContractAbi(
    context: ApillonApiContext,
    body: ApillonApiContractAbiQueryDTO,
  ) {
    return (await new ContractsMicroservice(context).getContractAbi(body)).data;
  }

  async deployContract(
    context: ApillonApiContext,
    body: ApillonApiCreateContractDTO,
  ) {
    return (await new ContractsMicroservice(context).deployContract(body)).data;
  }

  //#endregion
  //#region ------------- CONTRACT DEPLOYS ------------

  async listDeployedContracts(
    context: ApillonApiContext,
    query: ApillonApiDeployedContractsQueryFilterDTO,
  ) {
    return (
      await new ContractsMicroservice(context).listDeployedContracts(query)
    ).data;
  }

  async getDeployedContract(context: ApillonApiContext, uuid: string) {
    return (await new ContractsMicroservice(context).getDeployedContract(uuid))
      .data;
  }

  async callDeployedContract(
    context: ApillonApiContext,
    body: ApillonApiCallContractDTO,
  ) {
    return (await new ContractsMicroservice(context).callDeployedContract(body))
      .data;
  }

  async getDeployedContractAbi(
    context: ApillonApiContext,
    body: ApillonApiContractAbiQueryDTO,
  ) {
    return (
      await new ContractsMicroservice(context).getDeployedContractAbi(body)
    ).data;
  }

  async archiveDeployedContract(
    context: ApillonApiContext,
    contract_deploy_uuid: string,
  ) {
    return (
      await new ContractsMicroservice(context).archiveDeployedContract(
        contract_deploy_uuid,
      )
    ).data;
  }

  async listDeployedContractTransactions(
    context: ApillonApiContext,
    query: ApillonApiContractTransactionQueryFilterDTO,
  ) {
    return (
      await new ContractsMicroservice(context).listDeployedContractTransactions(
        query,
      )
    ).data;
  }

  //#endregion
}

import {
  CallContractDTO,
  ContractAbiQueryDTO,
  ContractsQueryFilter,
  ContractTransactionQueryFilter,
  CreateContractDTO,
  DeployedContractsQueryFilter,
  Lmas,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import {
  ContractsCodeException,
  ContractsValidationException,
} from '../../lib/exceptions';
import { handleEthersException } from '../../lib/utils/contract-utils';
import { ContractService } from '../../lib/services/contract-service';
import { AbiHelper, AbiHelperError } from '../../lib/utils/abi-helper';

export class ContractsController {
  private readonly context: ServiceContext;
  private readonly contractService: ContractService;
  private logging: Lmas;

  constructor(
    context: ServiceContext,
    contractService: ContractService,
    logging: Lmas,
  ) {
    this.context = context;
    this.contractService = contractService;
    this.logging = logging;
  }

  //#region contract functions

  async listContracts(event: { query: ContractsQueryFilter }) {
    return await this.contractService.listContracts(
      new ContractsQueryFilter(event.query),
    );
  }

  async getContract(event: { contract_uuid: string }) {
    const contract =
      await this.contractService.getContractWithVersionAndMethods(
        event.contract_uuid,
      );

    return contract.serializeByContext(this.context);
  }

  async getContractAbi(event: { query: ContractAbiQueryDTO }) {
    return this.contractService.getContractAbi(
      event.query.contract_uuid,
      event.query.solidityJson,
    );
  }

  //#endregion

  //#region deployed contract functions

  async getDeployedContract(event: { uuid: any }) {
    const contractDeploy = await this.contractService.getDeployedContract(
      event.uuid,
    );

    return contractDeploy.serializeByContext();
  }

  async getDeployedContractAbi(event: { query: ContractAbiQueryDTO }) {
    return await this.contractService.getDeployedContractAbi(
      event.query.contract_uuid,
      event.query.solidityJson,
    );
  }

  /**
   * Get contracts details for a project by project_uuid.
   * @param {{ project_uuid: string }} - uuid of the project
   */
  async getProjectDeployedContractDetails({
    project_uuid,
  }: {
    project_uuid: string;
  }): Promise<{ numOfContracts: number; contractTransactionCount: number }> {
    return await this.contractService.getProjectDeployedContractDetails(
      project_uuid,
    );
  }

  async archiveDeployedContract(event: { contract_uuid: string }) {
    const contractDeploy = await this.contractService.archiveDeployedContract(
      event.contract_uuid,
    );

    return contractDeploy.serializeByContext(this.context);
  }

  async listContractDeploys(event: { query: DeployedContractsQueryFilter }) {
    return await this.contractService.listContractDeploys(
      new DeployedContractsQueryFilter(event.query),
    );
  }

  async listDeployedContractTransactions(event: {
    query: ContractTransactionQueryFilter;
  }) {
    return await this.contractService.listDeployedContractTransactions(
      new ContractTransactionQueryFilter(event.query),
    );
  }

  //#endregion

  //#region on-chain
  async deployContract(params: { body: CreateContractDTO }) {
    const { body } = params;
    console.log(
      `Deploying contract with uuid ${body.contract_uuid}:`,
      ` ${JSON.stringify(body)}`,
    );
    const contractDeployData = await this.contractService.getDeployContractData(
      body.contract_uuid,
    );

    try {
      new AbiHelper(contractDeployData.abi).validateConstructorCall(
        params.body.constructorArguments,
      );

      const txData = this.contractService.prepareDeployTransaction(
        contractDeployData.abi,
        contractDeployData.bytecode,
        body.constructorArguments,
      );
      const contractDeploy = await this.contractService.createAndDeployContract(
        params.body.project_uuid,
        params.body.name,
        params.body.description,
        params.body.chain,
        contractDeployData.contract_version_id,
        body.constructorArguments,
        txData,
      );
      await this.contractService.onContractDeployed(
        contractDeploy.project_uuid,
        contractDeploy.contract_uuid,
        contractDeployData.contractType,
      );

      return contractDeploy.serializeByContext(this.context);
    } catch (e: unknown) {
      if (e instanceof ContractsCodeException) {
        throw e;
      }
      await handleEthersException(
        e,
        contractDeployData.abi,
        'constructorArguments',
        params.body.project_uuid,
        this.context.user?.user_uuid,
      );
    }
  }

  async callDeployedContract(params: { body: CallContractDTO }) {
    console.log(`Call contract: ${JSON.stringify(params.body)}`);
    const contractDeploy =
      await this.contractService.getDeployedContractForCall(
        params.body.contract_uuid,
      );

    const abi = contractDeploy.contractVersion.abi;

    try {
      new AbiHelper(abi).validateCallMethod(
        params.body.methodName,
        params.body.methodArguments,
      );

      return await this.contractService.callContract(
        contractDeploy,
        abi,
        contractDeploy.contractVersion.transferOwnershipMethod,
        params.body.methodName,
        params.body.methodArguments,
      );
    } catch (e: unknown) {
      if (e instanceof ContractsValidationException) {
        throw e;
      }
      if (e instanceof AbiHelperError) {
        throw new ContractsValidationException({
          code: 'ABI_ERROR',
          property: 'method',
          message: e.message,
        });
      }
      await handleEthersException(
        e,
        abi,
        'constructorArguments',
        contractDeploy.project_uuid,
        this.context.user?.user_uuid,
      );
    }
  }
  //#endregion
}

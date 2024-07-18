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
import { ContractService } from './services/contract-service';
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

  async listContracts(query: ContractsQueryFilter) {
    return await this.contractService.listContracts(
      new ContractsQueryFilter(query),
    );
  }

  async getContract(contract_uuid: string) {
    const contract =
      await this.contractService.getContractWithVersionAndMethods(
        contract_uuid,
      );

    return contract.serializeByContext(this.context);
  }

  async getContractAbi(query: ContractAbiQueryDTO) {
    return this.contractService.getContractAbi(
      query.contract_uuid,
      query.solidityJson,
    );
  }

  //#endregion

  //#region deployed contract functions

  async getDeployedContract(contract_uuid: string) {
    const contractDeploy =
      await this.contractService.getDeployedContract(contract_uuid);

    return contractDeploy.serializeByContext();
  }

  async getDeployedContractAbi(query: ContractAbiQueryDTO) {
    return await this.contractService.getDeployedContractAbi(
      query.contract_uuid,
      query.solidityJson,
    );
  }

  /**
   * Get contracts details for a project by project_uuid.
   * @param project_uuid
   */
  async getProjectDeployedContractDetails(
    project_uuid: string,
  ): Promise<{ numOfContracts: number; contractTransactionCount: number }> {
    return await this.contractService.getProjectDeployedContractDetails(
      project_uuid,
    );
  }

  async archiveDeployedContract(contract_uuid: string) {
    const contractDeploy =
      await this.contractService.archiveDeployedContract(contract_uuid);

    return contractDeploy.serializeByContext(this.context);
  }

  async listContractDeploys(query: DeployedContractsQueryFilter) {
    return await this.contractService.listContractDeploys(
      new DeployedContractsQueryFilter(query),
    );
  }

  async listDeployedContractTransactions(
    query: ContractTransactionQueryFilter,
  ) {
    return await this.contractService.listDeployedContractTransactions(
      new ContractTransactionQueryFilter(query),
    );
  }

  //#endregion

  //#region on-chain
  async deployContract(body: CreateContractDTO) {
    console.log(
      `Deploying contract with uuid ${body.contract_uuid}:`,
      ` ${JSON.stringify(body)}`,
    );
    const contractDeployData = await this.contractService.getDeployContractData(
      body.contract_uuid,
    );

    try {
      new AbiHelper(contractDeployData.abi).validateConstructorCall(
        body.constructorArguments,
      );

      const txData = this.contractService.prepareDeployTransaction(
        contractDeployData.abi,
        contractDeployData.bytecode,
        body.constructorArguments,
      );
      const contractDeploy = await this.contractService.createAndDeployContract(
        body.project_uuid,
        body.name,
        body.description,
        body.chain,
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
        body.project_uuid,
        this.context.user?.user_uuid,
      );
    }
  }

  async callDeployedContract(body: CallContractDTO) {
    console.log(`Call contract: ${JSON.stringify(body)}`);
    const contractDeploy =
      await this.contractService.getDeployedContractForCall(body.contract_uuid);
    if (!contractDeploy.canCallMethod(body.methodName)) {
      throw new ContractsValidationException({
        code: 'ABI_ERROR',
        property: 'method',
        message: `Not allowed to call method ${body.methodName}`,
      });
    }
    const abi = contractDeploy.contractVersion.abi;

    try {
      new AbiHelper(abi).validateCallMethod(
        body.methodName,
        body.methodArguments,
      );

      return await this.contractService.callContract(
        contractDeploy,
        abi,
        contractDeploy.contractVersion.transferOwnershipMethod,
        body.methodName,
        body.methodArguments,
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

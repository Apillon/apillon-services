import {
  CallContractDTO,
  ChainType,
  ContractAbiQuery,
  ContractsQueryFilter,
  CreateContractDTO,
  DeployedContractsQueryFilter,
  Lmas,
  LogType,
  ServiceName,
  SmartContractType,
  TransactionQueryFilter,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ContractsErrorCode } from '../../config/types';
import {
  ContractsCodeException,
  ContractsException,
  ContractsValidationException,
} from '../../lib/exceptions';
import { parseError } from '../../lib/utils/contract-utils';
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
    return await this.contractService.listContracts(event.query);
  }

  async getContract(event: { contract_uuid: string }) {
    const contract =
      await this.contractService.getContractWithVersionAndMethods(
        event.contract_uuid,
      );

    return contract.serializeByContext(this.context);
  }

  async getContractAbi(event: { uuid: string; query: ContractAbiQuery }) {
    return this.contractService.getContractAbi(
      event.uuid,
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

  async getDeployedContractAbi(event: {
    uuid: string;
    query: ContractAbiQuery;
  }) {
    return await this.contractService.getDeployedContractAbi(
      event.uuid,
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
    return await this.contractService.listContractDeploys(event.query);
  }

  async listDeployedContractTransactions(event: {
    contract_uuid: string;
    query: TransactionQueryFilter;
  }) {
    return await this.contractService.listDeployedContractTransactions(
      event.contract_uuid,
      event.query,
    );
  }

  //#endregion

  //#region on-chain
  async deployContract(params: { body: CreateContractDTO }) {
    console.log(`Creating contract: ${JSON.stringify(params.body)}`);
    const { contract_uuid, constructorArguments } = params.body;
    let contractDeployData: {
      contract_version_id: number;
      abi: unknown[];
      bytecode: string;
      contractType: SmartContractType;
    };
    try {
      contractDeployData =
        await this.contractService.getDeployContractData(contract_uuid);
    } catch (err) {
      throw await new ContractsCodeException({
        status: 500,
        errorMessage: `Error getting contract version for contract with uuid ${contract_uuid}.`,
        code: ContractsErrorCode.GENERAL_SERVER_ERROR,
      }).writeToMonitor({
        context: this.context,
        logType: LogType.ERROR,
        data: { err, contract_uuid, chainType: ChainType.EVM },
        sendAdminAlert: true,
      });
    }
    let txData: string;
    try {
      txData = this.contractService.createDeployTransaction(
        contractDeployData.abi,
        contractDeployData.bytecode,
        constructorArguments,
      );
    } catch (e: unknown) {
      throw parseError(e, contractDeployData.abi, 'constructorArguments');
    }

    try {
      const contractData = await this.contractService.createAndDeployContract(
        params.body.project_uuid,
        params.body.name,
        params.body.description,
        params.body.chain,
        contractDeployData.contract_version_id,
        constructorArguments,
        txData,
      );
      await this.contractService.onContractDeployed(
        contractData.project_uuid,
        contractData.contract_uuid,
        contractDeployData.contractType,
      );

      return contractData;
    } catch (e: unknown) {
      if (!(e instanceof Error)) {
        throw e;
      }
      const error = new ContractsException(
        ContractsErrorCode.DEPLOY_CONTRACT_ERROR,
        this.context,
        e,
      );
      await error.writeToMonitor({
        logType: LogType.ERROR,
        service: ServiceName.CONTRACTS,
        project_uuid: params.body.project_uuid,
        user_uuid: this.context.user?.user_uuid,
        data: {
          body: params.body,
          e,
        },
        sendAdminAlert: true,
      });
    }
  }

  async callDeployedContract(params: { body: CallContractDTO }) {
    console.log(`Call contract: ${JSON.stringify(params.body)}`);
    const contractDeploy =
      await this.contractService.getDeployedContractForCall(
        params.body.contract_uuid,
      );

    if (!contractDeploy.canCallMethod(params.body.methodName)) {
      throw new ContractsValidationException({
        code: 'ABI_ERROR',
        property: 'method',
        message: `Not allowed to call method ${params.body.methodName}`,
      });
    }
    const abi = contractDeploy.contractVersion.abi;

    try {
      AbiHelper.validateCallMethod(abi, params.body.methodName);

      return await this.contractService.callContract(
        contractDeploy,
        abi,
        contractDeploy.contractVersion.transferOwnershipMethod,
        params.body.methodName,
        params.body.methodArguments,
      );
    } catch (e: unknown) {
      if (e instanceof AbiHelperError) {
        throw new ContractsValidationException({
          code: 'ABI_ERROR',
          property: 'method',
          message: e.message,
        });
      }
      throw parseError(e, abi, 'constructorArguments');
    }
  }
  //#endregion
}

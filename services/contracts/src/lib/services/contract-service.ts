import { ServiceContext } from '@apillon/service-lib';
import {
  BlockchainMicroservice,
  ChainType,
  ContractsQueryFilter,
  CreateEvmTransactionDto,
  DeployedContractsQueryFilter,
  EvmChain,
  Lmas,
  LogType,
  Mailing,
  MySql,
  ProductCode,
  ServiceName,
  SmartContractType,
  spendCreditAction,
  SpendCreditDto,
  SqlModelStatus,
  TransactionQueryFilter,
  TransactionStatus,
} from '@apillon/lib';
import { EVMContractClient } from '../../modules/clients/evm-contract.client';
import {
  ContractsErrorCode,
  ContractStatus,
  DbTables,
  TransactionType,
} from '../../config/types';
import { Transaction } from '../../modules/contracts/models/transaction.model';
import { v4 as uuidV4 } from 'uuid';
import { ContractRepository } from '../repositores/contract-repository';
import { TransactionRepository } from '../repositores/transaction-repository';
import { ContractVersion } from '../../modules/contracts/models/contractVersion.model';
import { ContractDeploy } from '../../modules/contracts/models/contractDeploy.model';
import { ContractsCodeException } from '../exceptions';

export class ContractService {
  private readonly context: ServiceContext;
  private mysql: MySql;
  private contractRepository: ContractRepository;
  private transactionRepository: TransactionRepository;
  private readonly blockchainService: BlockchainMicroservice;
  private mailingClient: Mailing;
  private logging: Lmas;

  constructor(
    context: ServiceContext,
    contractRepository: ContractRepository,
    transactionRepository: TransactionRepository,
    blockchainService: BlockchainMicroservice,
    mailingClient: Mailing,
    logging: Lmas,
  ) {
    this.contractRepository = contractRepository;
    this.transactionRepository = transactionRepository;
    this.blockchainService = blockchainService;
    this.mailingClient = mailingClient;
    this.logging = logging;
    this.context = context;
    this.mysql = context.mysql;
  }

  createDeployTransaction(
    abi: unknown[],
    bytecode: string,
    constructorArguments: unknown[],
  ) {
    return EVMContractClient.createDeployTransaction(
      abi,
      bytecode,
      constructorArguments,
    );
  }

  async createAndDeployContract(
    project_uuid: string,
    name: string,
    description: string,
    chain: EvmChain,
    contract_version_id: number,
    constructorArguments: unknown[],
    txData: string,
  ) {
    const contractDeploy = await this.contractRepository.newContractDeploy(
      project_uuid,
      name,
      description,
      chain,
      contract_version_id,
      constructorArguments,
    );

    const spendCredit = this.getCreateContractSpendDto(
      contractDeploy.chain,
      contractDeploy.project_uuid,
      contractDeploy.contract_uuid,
    );
    const { data: transactionData } = await spendCreditAction(
      this.context,
      spendCredit,
      () =>
        this.blockchainService.createEvmTransaction(
          new CreateEvmTransactionDto(
            {
              chain: chain,
              transaction: txData,
              referenceTable: DbTables.CONTRACT,
              referenceId: contractDeploy.contract_uuid,
              project_uuid: project_uuid,
            },
            this.context,
          ),
        ),
    );

    await this.contractRepository.saveContractDeploy(
      contractDeploy.populate({
        contractAddress: transactionData.data,
        deployerAddress: transactionData.address,
        transactionHash: transactionData.transactionHash,
        status: SqlModelStatus.ACTIVE,
      }),
    );
    await this.transactionRepository.createTransaction(
      new Transaction(
        {
          chainId: chain,
          transactionType: TransactionType.DEPLOY_CONTRACT,
          refTable: DbTables.CONTRACT,
          refId: contractDeploy.id,
          transactionHash: transactionData.transactionHash,
          transactionStatus: TransactionStatus.PENDING,
        },
        this.context,
      ),
    );

    return {
      ...contractDeploy.serialize(),
      project_uuid: contractDeploy.project_uuid,
      contract_uuid: contractDeploy.contract_uuid,
    };
  }

  async onContractDeployed(
    project_uuid: string,
    contract_uuid: string,
    _contractType: SmartContractType,
  ) {
    try {
      //TODO: add this back if NFT service is replaced by this service
      // const mailerLiteField = `has_${SmartContractType[contractType].toLowerCase()}_contract`;
      await Promise.all([
        this.logging.writeLog({
          context: this.context,
          project_uuid,
          logType: LogType.INFO,
          message: 'New contract created and submitted for deployment',
          location: 'ContractsService/createContract',
          service: ServiceName.CONTRACTS,
          data: { contract_uuid },
        }),
        // Set mailerlite field indicating the user has a contract
        // this.mailingClient.setMailerliteField(mailerLiteField, true),
      ]);
    } catch (e: unknown) {
      // just log and proceed in case MailerLite call fails
      await this.logging.writeLog({
        message: 'Failed to execute onContractDeployed side effect.',
        logType: LogType.ERROR,
        service: ServiceName.CONTRACTS,
        project_uuid: project_uuid,
        user_uuid: this.context.user?.user_uuid,
        data: {
          contract_uuid,
          e,
        },
        sendAdminAlert: true,
      });
    }
  }

  async getDeployedContractForCall(contract_uuid: string) {
    const contractDeploy =
      await this.contractRepository.getDeployedContractByUUID(contract_uuid);
    const contractVersion = await new ContractVersion({}, this.context).getById(
      contractDeploy.version_id,
    );

    switch (contractDeploy.contractStatus) {
      case ContractStatus.DEPLOYED:
        break;
      case ContractStatus.TRANSFERRING:
      case ContractStatus.TRANSFERRED:
        throw new ContractsCodeException({
          status: 500,
          code: ContractsErrorCode.CONTRACT_OWNER_ERROR,
          context: this.context,
          sourceFunction: 'callDeployedContract',
        });
      default:
        throw new ContractsCodeException({
          status: 500,
          code: ContractsErrorCode.CONTRACT_NOT_DEPLOYED,
          context: this.context,
          sourceFunction: 'callDeployedContract',
        });
    }

    return {
      contractDeploy,
      abi: contractVersion.abi,
      transferOwnershipMethod: contractVersion.transferOwnershipMethod,
    };
  }

  async createCallTransaction(
    chain: EvmChain,
    contractAddress: string,
    abi: unknown[],
    method: string,
    callArguments: unknown[],
  ) {
    const rpcEndpoint = (
      await this.blockchainService.getChainEndpoint(chain, ChainType.EVM)
    ).data?.url;

    const evmContractClient = EVMContractClient.getInstance(
      rpcEndpoint,
      abi,
      contractAddress,
    );

    return await evmContractClient.createTransaction(method, callArguments);
  }

  async callContract(
    contractDeploy: ContractDeploy,
    abi: unknown[],
    transferOwnershipMethod: string,
    methodName: string,
    methodArguments: unknown[],
  ) {
    const txData = await this.createCallTransaction(
      contractDeploy.chain,
      contractDeploy.contractAddress,
      abi,
      methodName,
      methodArguments,
    );
    const spendCredit = this.getCallContractSpendDto(
      contractDeploy.chain,
      contractDeploy.project_uuid,
    );
    const { data: transactionData } = await spendCreditAction(
      this.context,
      spendCredit,
      () =>
        this.blockchainService.createEvmTransaction(
          new CreateEvmTransactionDto({
            chain: contractDeploy.chain,
            transaction: txData,
            fromAddress: contractDeploy.deployerAddress,
            referenceTable: DbTables.CONTRACT,
            referenceId: contractDeploy.contract_uuid,
            project_uuid: contractDeploy.project_uuid,
            //minimumGas: 46000,
            minimumGas: 96000,
          }),
        ),
    );
    await this.logging.writeLog({
      context: this.context,
      project_uuid: contractDeploy.project_uuid,
      logType: LogType.INFO,
      message: 'contract called',
      location: 'ContractsService/callContract',
      service: ServiceName.CONTRACTS,
      data: { contract_uuid: contractDeploy.contract_uuid },
    });

    const transactionType =
      methodName === transferOwnershipMethod
        ? TransactionType.TRANSFER_CONTRACT_OWNERSHIP
        : TransactionType.CALL_CONTRACT;
    await this.transactionRepository.createTransaction(
      new Transaction(
        {
          chainId: contractDeploy.chain,
          transactionType,
          refTable: DbTables.CONTRACT,
          refId: contractDeploy.id,
          transactionHash: transactionData.transactionHash,
          transactionStatus: TransactionStatus.PENDING,
          transaction_uuid: spendCredit.referenceId,
        },
        this.context,
      ),
    );
    if (transactionType === TransactionType.TRANSFER_CONTRACT_OWNERSHIP) {
      await this.contractRepository.updateContractDeployStatus(
        contractDeploy.id,
        ContractStatus.TRANSFERRING,
      );
    }

    return transactionData;
  }

  // PRIVATE METHODS
  private getCreateContractSpendDto(
    chain: EvmChain,
    project_uuid: string,
    contract_uuid: string,
  ) {
    const product_id = {
      [EvmChain.ETHEREUM]: ProductCode.CONTRACT_ETHEREUM_CREATE,
      [EvmChain.SEPOLIA]: ProductCode.CONTRACT_SEPOLIA_CREATE,
      [EvmChain.MOONBASE]: ProductCode.CONTRACT_MOONBASE_CREATE,
      [EvmChain.MOONBEAM]: ProductCode.CONTRACT_MOONBEAM_CREATE,
      [EvmChain.ASTAR]: ProductCode.CONTRACT_ASTAR_CREATE,
    }[chain];

    //Spend credit
    return new SpendCreditDto(
      {
        project_uuid: project_uuid,
        product_id,
        referenceTable: DbTables.CONTRACT,
        referenceId: contract_uuid,
        location: 'ContractsService.createContract',
        service: ServiceName.CONTRACTS,
      },
      this.context,
    );
  }

  private getCallContractSpendDto(chain: EvmChain, project_uuid: string) {
    const product_id = {
      [EvmChain.ETHEREUM]: ProductCode.CONTRACT_ETHEREUM_CALL,
      [EvmChain.SEPOLIA]: ProductCode.CONTRACT_SEPOLIA_CALL,
      [EvmChain.MOONBASE]: ProductCode.CONTRACT_MOONBASE_CALL,
      [EvmChain.MOONBEAM]: ProductCode.CONTRACT_MOONBEAM_CALL,
      [EvmChain.ASTAR]: ProductCode.CONTRACT_ASTAR_CALL,
    }[chain];
    return new SpendCreditDto(
      {
        project_uuid: project_uuid,
        product_id,
        referenceTable: DbTables.CONTRACT,
        referenceId: uuidV4(),
        location: 'ContractsService.callContract',
        service: ServiceName.CONTRACTS,
      },
      this.context,
    );
  }

  async listContracts(query: ContractsQueryFilter) {
    return await this.contractRepository.getList(
      new ContractsQueryFilter(query),
    );
  }

  async listContractDeploys(query: DeployedContractsQueryFilter) {
    return await this.contractRepository.getDeployedList(
      new DeployedContractsQueryFilter(query),
    );
  }

  async getProjectDeployedContractDetails(project_uuid: string) {
    const numOfContracts =
      await this.contractRepository.getContractDeployedCount();

    const contractTransactionCount =
      await this.transactionRepository.getTransactionCountOnProject(
        project_uuid,
      );

    return { numOfContracts, contractTransactionCount };
  }

  async listDeployedContractTransactions(
    contract_uuid: string,
    query: TransactionQueryFilter,
  ) {
    const contract =
      await this.contractRepository.getDeployedContractByUUID(contract_uuid);

    contract.canAccess(this.context);

    const transactionQuery = new TransactionQueryFilter(query).populate({
      refTable: DbTables.CONTRACT,
      refId: contract.id,
    });

    return this.transactionRepository.getList(transactionQuery);
  }

  async getDeployContractData(
    contract_uuid: string,
    // artifact: string,
  ) {
    // TODO: code meant for custom contracts
    // if (!contractType) {
    //   // parse from artifact
    //   const { abi, bytecode } = AbiHelper.getAbiAndBytecode(artifact);
    //   const issues = AbiHelper.validateAbi(abi);
    //   if (issues) {
    //     throw new ContractsValidationException(issues);
    //   }
    //
    //   return {
    //     id: null,
    //     abi,
    //     bytecode,
    //     contractType:
    //   };
    // }

    // load from DB
    const { contractVersion, ...contract } =
      await this.contractRepository.getLatestContractVersion(contract_uuid);

    return {
      contract_version_id: contractVersion.id,
      abi: contractVersion.abi,
      bytecode: contractVersion.bytecode,
      contractType: contract.contractType,
    };
  }
}

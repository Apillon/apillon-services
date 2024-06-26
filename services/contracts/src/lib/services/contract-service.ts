import { ServiceContext } from '@apillon/service-lib';
import {
  BlockchainMicroservice,
  ChainType,
  DeployedContractsQueryFilter,
  CreateEvmTransactionDto,
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
  ContractsQueryFilter,
} from '@apillon/lib';
import { EVMContractClient } from '../../modules/clients/evm-contract.client';
import { DbTables, TransactionType } from '../../config/types';
import { Transaction } from '../../modules/contracts/models/transaction.model';
import { v4 as uuidV4 } from 'uuid';
import { ContractRepository } from '../repositores/contract-repository';
import { TransactionRepository } from '../repositores/transaction-repository';
import { ContractsNotFoundException } from '../exceptions';
import { ContractVersion } from '../../modules/contracts/models/contractVersion.model';

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
    const contractDeploy = this.contractRepository.newContractDeploy(
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
    const conn = await this.mysql.start();
    try {
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
      contractDeploy.populate({
        contractAddress: transactionData.data,
        deployerAddress: transactionData.address,
        transactionHash: transactionData.transactionHash,
        status: SqlModelStatus.ACTIVE,
      });
      await this.contractRepository.saveContractDeploy(contractDeploy, conn);
      await this.transactionRepository.saveTransaction(
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
        conn,
      );
      await this.mysql.commit(conn);

      return {
        ...contractDeploy.serialize(),
        project_uuid: contractDeploy.project_uuid,
        contract_uuid: contractDeploy.contract_uuid,
      };
    } catch (e: unknown) {
      await this.mysql.rollback(conn);
      throw e;
    }
  }

  async onContractDeployed(
    project_uuid: string,
    contract_uuid: string,
    contractType: SmartContractType,
  ) {
    const mailerLiteField = `has_${SmartContractType[contractType].toLowerCase()}_contract`;
    try {
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
        this.mailingClient.setMailerliteField(mailerLiteField, true),
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

  async getContractData(contract_uuid: string) {
    const contract =
      await this.contractRepository.getContractByUUID(contract_uuid);
    if (!contract) {
      // TODO: this exception should be in controller
      throw new ContractsNotFoundException();
    }

    const contractVersion = await new ContractVersion({}, this.context).getById(
      contract.version_id,
    );

    return {
      project_uuid: contract.project_uuid,
      contract_id: contract.id,
      contract_uuid: contract.contract_uuid,
      deployerAddress: contract.deployerAddress,
      chain: contract.chain,
      contractAddress: contract.contractAddress,
      abi: contractVersion.abi,
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

  async sendCallTransaction(
    project_uuid: string,
    contract_id: number,
    contract_uuid: string,
    deployerAddress: string,
    chain: EvmChain,
    txData: string,
  ) {
    const spendCredit = this.getCallContractSpendDto(chain, project_uuid);
    const conn = await this.mysql.start();
    try {
      const { data: transactionData } = await spendCreditAction(
        this.context,
        spendCredit,
        () =>
          this.blockchainService.createEvmTransaction(
            new CreateEvmTransactionDto({
              chain,
              transaction: txData,
              fromAddress: deployerAddress,
              referenceTable: DbTables.CONTRACT,
              referenceId: contract_uuid,
              project_uuid,
              //minimumGas: 46000,
              minimumGas: 96000,
            }),
          ),
      );
      await this.transactionRepository.saveTransaction(
        new Transaction(
          {
            chainId: chain,
            transactionType: TransactionType.CALL_CONTRACT,
            refTable: DbTables.CONTRACT,
            refId: contract_id,
            transactionHash: transactionData.transactionHash,
            transactionStatus: TransactionStatus.PENDING,
            transaction_uuid: spendCredit.referenceId,
          },
          this.context,
        ),
        conn,
      );
      await this.mysql.commit(conn);
      return transactionData;
    } catch (e: unknown) {
      await this.mysql.rollback(conn);
      // TODO: proper error
      throw e;
    }
  }

  async onContractCalled(project_uuid: string, contract_uuid: string) {
    await this.logging.writeLog({
      context: this.context,
      project_uuid: project_uuid,
      logType: LogType.INFO,
      message: 'contract called',
      location: 'ContractsService/callContract',
      service: ServiceName.CONTRACTS,
      data: { contract_uuid: contract_uuid },
    });
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
      await this.contractRepository.getContractByUUID(contract_uuid);

    contract.canAccess(this.context);

    const transactionQuery = new TransactionQueryFilter(query).populate({
      refTable: DbTables.CONTRACT,
      refId: contract.id,
    });

    return this.transactionRepository.getList(transactionQuery);
  }

  async getDeployContractData(
    contract_id: number,
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
      await this.contractRepository.getLatestContractVersion(contract_id);

    return {
      contract_version_id: contractVersion.id,
      abi: contractVersion.abi,
      bytecode: contractVersion.bytecode,
      contractType: contract.contractType,
    };
  }
}

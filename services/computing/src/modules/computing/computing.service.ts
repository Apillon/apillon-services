import {
  AssignCidToNft,
  ClusterWalletQueryFilter,
  ComputingTransactionQueryFilter,
  ContractQueryFilter,
  CreateContractDto,
  EncryptContentDto,
  Lmas,
  LogType,
  ServiceName,
} from '@apillon/lib';
import {
  DepositToClusterDto,
  TransferOwnershipDto,
} from '@apillon/blockchain-lib/common';
import { ServiceContext } from '@apillon/service-lib';
import { ComputingErrorCode } from '../../config/types';
import {
  ComputingCodeException,
  ComputingNotFoundException,
} from '../../lib/exceptions';
import { depositToPhalaCluster } from '../../lib/utils/contract-utils';
import { Contract } from './models/contract.model';
import { Transaction } from '../transaction/models/transaction.model';
import { ClusterWallet } from './models/cluster-wallet.model';

export class ComputingService {
  /**
   * Creates a new computing contract with the given data
   * @param {{ body: CreateContractDto }} params - Contract creation params
   * @param {ServiceContext} context
   * @returns {Contract}
   */
  /**
   * @deprecated Schrodinger contract functionality is deprecated and will be removed in a future release
   */
  static async createContract(
    params: { body: CreateContractDto },
    context: ServiceContext,
  ) {
    console.log(`Creating computing contract: ${JSON.stringify(params.body)}`);

    // Throw error indicating that Schrodinger contract is deprecated
    throw await new ComputingCodeException({
      status: 410, // Gone
      code: ComputingErrorCode.DEPLOY_CONTRACT_ERROR,
      context,
      sourceFunction: 'createContract()',
      errorMessage:
        'Schrodinger contract functionality is deprecated and no longer available.',
    }).writeToMonitor({
      logType: LogType.WARN,
      service: ServiceName.COMPUTING,
      data: { dto: params.body },
    });
  }

  /**
   * Returns a list of all contracts for a project
   * @param {{ query: ContractQueryFilter }} event
   * @param {ServiceContext} context
   * @returns {Contract[]}
   */
  static async listContracts(
    event: { query: ContractQueryFilter },
    context: ServiceContext,
  ) {
    return await new Contract(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new ContractQueryFilter(event.query));
  }

  /**
   * Gets a contract by UUID
   * @param {{ uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<Contract>}
   */
  static async getContractByUuid(
    event: { uuid: string },
    context: ServiceContext,
  ): Promise<Contract> {
    const contract = await new Contract({}, context).populateByUUID(event.uuid);

    if (!contract.exists()) {
      throw new ComputingNotFoundException();
    }
    contract.canAccess(context);

    return contract.serializeByContext() as Contract;
  }

  /**
   * Set a contract's status to archived
   * @param {{ uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<Contract>}
   */
  static async archiveContract(
    event: { uuid: string },
    context: ServiceContext,
  ): Promise<Contract> {
    const contract = await new Contract({}, context).populateByUUID(event.uuid);

    if (!contract.exists()) {
      throw new ComputingNotFoundException();
    }
    contract.canModify(context);

    return await contract.markArchived();
  }

  /**
   * Set a contract's status to active
   * @param {{ uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<Contract>}
   */
  static async activateContract(
    event: { uuid: string },
    context: ServiceContext,
  ): Promise<Contract> {
    const contract = await new Contract({}, context).populateByUUID(event.uuid);

    if (!contract.exists()) {
      throw new ComputingNotFoundException();
    }
    contract.canModify(context);

    return await contract.markActive();
  }

  /**
   * Gets list of the contract's transaction based on the query filter
   * @param {{ query: ComputingTransactionQueryFilter }} event
   * @param {ServiceContext} context
   * @returns {Transaction[]}
   */
  static async listTransactions(
    event: { query: ComputingTransactionQueryFilter },
    context: ServiceContext,
  ) {
    const contract = await new Contract({}, context).populateByUUID(
      event.query.contract_uuid,
    );

    if (!contract.exists()) {
      throw new ComputingNotFoundException();
    }
    contract.canAccess(context);

    return await new Transaction(
      { project_uuid: contract.project_uuid },
      context,
    ).getList(context, new ComputingTransactionQueryFilter(event.query));
  }

  /**
   * Deposits funds from wallet to Phala cluster
   * @param {{ body: DepositToClusterDto }} params - Contains cluster data
   * @param {ServiceContext} context
   */
  static async depositToPhalaCluster(
    params: { body: DepositToClusterDto },
    context: ServiceContext,
  ) {
    console.log(`Depositing to cluster: ${JSON.stringify(params.body)}`);
    const sourceFunction = 'depositToCluster()';

    const clusterId = params.body.clusterId;
    const amount = params.body.amount;
    const accountAddress = params.body.accountAddress;
    try {
      await depositToPhalaCluster(context, clusterId, accountAddress, amount);
    } catch (e: any) {
      throw await new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.DEPOSIT_TO_PHALA_CLUSTER_ERROR,
        context,
        sourceFunction,
        errorMessage: `Error depositing to Phala cluster: ${e.message}`,
        details: e,
      }).writeToMonitor({});
    }

    await new Lmas().writeLog({
      context,
      logType: LogType.INFO,
      message: `${amount}PHA deposited to address ${accountAddress} in cluster ${clusterId}`,
      location: 'ComputingService/depositToCluster',
      service: ServiceName.COMPUTING,
      data: {
        clusterId,
        accountAddress,
        amount,
      },
    });

    return { success: true };
  }

  /**
   * Transfers ownership of the computing contract to another address
   * @param {{ body: TransferOwnershipDto }} param0 - Contains new owner address
   * @param {ServiceContext} context
   * @returns {{success: boolean}}
   */
  /**
   * @deprecated Schrodinger contract functionality is deprecated and will be removed in a future release
   */
  static async transferContractOwnership(
    { body }: { body: TransferOwnershipDto },
    context: ServiceContext,
  ) {
    console.log(`Transferring contract ownership: ${JSON.stringify(body)}`);

    // Throw error indicating that Schrodinger contract is deprecated
    throw await new ComputingCodeException({
      status: 410, // Gone
      code: ComputingErrorCode.TRANSFER_CONTRACT_ERROR,
      context,
      sourceFunction: 'transferContractOwnership()',
      errorMessage:
        'Schrodinger contract functionality is deprecated and no longer available.',
    }).writeToMonitor({
      logType: LogType.WARN,
      service: ServiceName.COMPUTING,
      data: { dto: body },
    });
  }

  /**
   * Sends an encrypt request to the contract
   * for a given content in the form of a string
   * @param {{ body: EncryptContentDto }} param
   * @param {ServiceContext} context
   */
  /**
   * @deprecated Schrodinger contract functionality is deprecated and will be removed in a future release
   */
  static async encryptContent(
    { body }: { body: EncryptContentDto },
    context: ServiceContext,
  ) {
    const sourceFunction = 'encryptContent()';

    // Throw error indicating that Schrodinger contract is deprecated
    throw await new ComputingCodeException({
      status: 410, // Gone
      code: ComputingErrorCode.FAILED_TO_ENCRYPT_CONTENT,
      context,
      sourceFunction,
      errorMessage:
        'Schrodinger contract functionality is deprecated and no longer available.',
    }).writeToMonitor({
      logType: LogType.WARN,
      service: ServiceName.COMPUTING,
      data: { dto: body },
    });
  }

  /**
   * Creates a mapping on the contract for which NFT token ID decrypts a file with a given CID
   * @param {{ body: AssignCidToNft }} param
   * @param {ServiceContext} context
   */
  /**
   * @deprecated Schrodinger contract functionality is deprecated and will be removed in a future release
   */
  static async assignCidToNft(
    { body }: { body: AssignCidToNft },
    context: ServiceContext,
  ) {
    const sourceFunction = 'assignCidToNft()';

    // Throw error indicating that Schrodinger contract is deprecated
    throw await new ComputingCodeException({
      status: 410, // Gone
      code: ComputingErrorCode.FAILED_TO_ASSIGN_CID_TO_NFT,
      context,
      sourceFunction,
      errorMessage:
        'Schrodinger contract functionality is deprecated and no longer available.',
    }).writeToMonitor({
      logType: LogType.WARN,
      service: ServiceName.COMPUTING,
      data: { dto: body },
    });
  }

  /**
   * List all cluster wallets for a given wallet
   * @param {{ query: ClusterWalletQueryFilter }} event
   * @param {ServiceContext} context
   * @returns {ClusterWallet[]}
   */
  static async listClusterWallets(
    event: { query: ClusterWalletQueryFilter },
    context: ServiceContext,
  ) {
    return await new ClusterWallet({}, context).getList(
      context,
      new ClusterWalletQueryFilter(event.query),
    );
  }

  /**
   * Get computing service details for a project.
   * @param {{ project_uuid: string }} - uuid of the project
   * @param {ServiceContext} context
   */
  static async getProjectComputingDetails(
    { project_uuid }: { project_uuid: string },
    context: ServiceContext,
  ): Promise<{ contractCount: number; computingTransactionCount: number }> {
    const { total: contractCount } = await new Contract(
      { project_uuid },
      context,
    ).getList(context, new ContractQueryFilter({ project_uuid }));

    const computingTransactionCount = await new Transaction(
      { project_uuid },
      context,
    ).getTransactionCountOnProject(project_uuid);

    return { contractCount, computingTransactionCount };
  }
}

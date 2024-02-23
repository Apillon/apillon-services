import {
  AssignCidToNft,
  ClusterWalletQueryFilter,
  ComputingContractType,
  ComputingTransactionQueryFilter,
  ContractQueryFilter,
  CreateBucketDto,
  CreateContractDto,
  DepositToClusterDto,
  EncryptContentDto,
  Lmas,
  LogType,
  ProductCode,
  SerializeFor,
  ServiceName,
  spendCreditAction,
  SpendCreditDto,
  SqlModelStatus,
  StorageMicroservice,
  TransferOwnershipDto,
} from '@apillon/lib';
import { getSerializationStrategy, ServiceContext } from '@apillon/service-lib';
import { v4 as uuidV4 } from 'uuid';
import {
  ComputingErrorCode,
  ComputingTransactionStatus,
  ContractStatus,
  DbTables,
  TransactionType,
} from '../../config/types';
import {
  ComputingCodeException,
  ComputingValidationException,
} from '../../lib/exceptions';
import {
  assignCidToNft,
  deployPhalaContract,
  depositToPhalaCluster,
  encryptContent,
  transferContractOwnership,
} from '../../lib/utils/contract-utils';
import { Contract } from './models/contract.model';
import { Transaction } from '../transaction/models/transaction.model';
import { ContractAbi } from './models/contractAbi.model';
import { ClusterWallet } from './models/cluster-wallet.model';

export class ComputingService {
  /**
   * Creates a new computing contract with the given data
   * @param {{ body: CreateContractDto }} params - Contract creation params
   * @param {ServiceContext} context
   * @returns {Contract}
   */
  static async createContract(
    params: { body: CreateContractDto },
    context: ServiceContext,
  ) {
    console.log(`Creating computing contract: ${JSON.stringify(params.body)}`);
    const createContractDto = new CreateContractDto(params.body);

    let bucket_uuid = createContractDto.bucket_uuid;
    if (bucket_uuid) {
      try {
        await new StorageMicroservice(context).getBucket(bucket_uuid);
      } catch (e) {
        if (e.status === 404) {
          throw await new ComputingCodeException({
            status: 404,
            code: ComputingErrorCode.BUCKET_NOT_FOUND,
            context,
            sourceFunction: 'createContract()',
            errorMessage: `Bucket with UUID ${bucket_uuid} not found.`,
          }).writeToMonitor({});
        } else {
          throw e;
        }
      }
    } else {
      console.log(
        `Creating bucket for computing contract with name ${createContractDto.name}.`,
      );
      const bucket = (
        await new StorageMicroservice(context).createBucket(
          new CreateBucketDto().populate({
            project_uuid: createContractDto.project_uuid,
            bucketType: 1,
            name: `${createContractDto.name} bucket`,
          }),
        )
      ).data;
      bucket_uuid = bucket.bucket_uuid;
    }

    const ipfsCluster = (
      await new StorageMicroservice(context).getProjectIpfsCluster(
        createContractDto.project_uuid,
      )
    ).data;
    const ipfsGatewayUrl = ipfsCluster.ipfsGateway.endsWith('/')
      ? ipfsCluster.ipfsGateway.slice(0, -1)
      : ipfsCluster.ipfsGateway;

    const contractType = ComputingContractType.SCHRODINGER;
    const contractAbi = await new ContractAbi({}, context).getLatest(
      contractType,
    );
    if (!contractAbi || !contractAbi.exists()) {
      throw await new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.DEPLOY_CONTRACT_ERROR,
        context,
        sourceFunction: 'createContract()',
        errorMessage: `Contract ABI not found for contract type ${contractType}.`,
      }).writeToMonitor({});
    }

    const contract = new Contract(createContractDto, context).populate({
      contract_uuid: uuidV4(),
      bucket_uuid,
      status: SqlModelStatus.ACTIVE,
      contractAbi_id: contractAbi.id,
      data: {
        nftContractAddress: createContractDto.contractData.nftContractAddress,
        nftChainRpcUrl: createContractDto.contractData.nftChainRpcUrl,
        restrictToOwner: createContractDto.contractData.restrictToOwner,
        ipfsGatewayUrl,
      },
    });
    // Set to true by default if not set
    if (contract.data.restrictToOwner === null) {
      contract.data.restrictToOwner = true;
    }

    try {
      await contract.validate();
    } catch (err) {
      await contract.handle(err);
      if (!contract.isValid()) {
        throw new ComputingValidationException(contract);
      }
    }

    const spendCredit = new SpendCreditDto(
      {
        project_uuid: contract.project_uuid,
        product_id: ProductCode.COMPUTING_SCHRODINGER_CREATE,
        referenceTable: DbTables.TRANSACTION,
        referenceId: uuidV4(),
        location: 'ComputingService.createContract',
        service: ServiceName.COMPUTING,
      },
      context,
    );
    await spendCreditAction(
      context,
      spendCredit,
      () =>
        new Promise(async (resolve, _reject) => {
          const conn = await context.mysql.start();
          try {
            await contract.insert(SerializeFor.INSERT_DB, conn);
            await deployPhalaContract(
              context,
              spendCredit.referenceId,
              contract,
              contractAbi,
              conn,
            );
            await context.mysql.commit(conn);
            resolve(true);
          } catch (err) {
            await context.mysql.rollback(conn);

            throw await new ComputingCodeException({
              status: 500,
              code: ComputingErrorCode.DEPLOY_CONTRACT_ERROR,
              context,
              sourceFunction: 'createContract()',
              errorMessage: `Error creating contract: ${err}`,
              details: err,
            }).writeToMonitor({
              logType: LogType.ERROR,
              service: ServiceName.COMPUTING,
              data: { dto: createContractDto.serialize(), err },
            });
          }
        }),
    );

    await new Lmas().writeLog({
      context,
      project_uuid: contract.project_uuid,
      logType: LogType.INFO,
      message: 'New Computing contract created and submitted for deployment',
      location: 'ComputingService/createContract',
      service: ServiceName.COMPUTING,
      data: { contract_uuid: contract.contract_uuid },
    });

    contract.updateTime = new Date();
    contract.createTime = new Date();

    return contract.serialize(getSerializationStrategy(context));
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
   * @returns {Contract}
   */
  static async getContractByUuid(
    event: { uuid: string },
    context: ServiceContext,
  ) {
    const contract = await new Contract({}, context).populateByUUID(event.uuid);

    if (!contract.exists()) {
      throw new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.CONTRACT_DOES_NOT_EXIST,
        context,
      });
    }
    contract.canAccess(context);

    return contract.serialize(getSerializationStrategy(context));
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
    return await new Transaction(
      { project_uuid: event.query.project_uuid },
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
        errorMessage: 'Error depositing to Phala cluster',
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
  static async transferContractOwnership(
    { body }: { body: TransferOwnershipDto },
    context: ServiceContext,
  ) {
    console.log(`Transferring contract ownership: ${JSON.stringify(body)}`);
    const newOwnerAddress = body.accountAddress;
    const contract = await new Contract({}, context).populateByUUID(
      body.contract_uuid,
    );
    const sourceFunction = 'ComputingService/transferContractOwnership()';
    contract.verifyStatusAndAccess(sourceFunction, context);
    await ComputingService.checkTransferConditions(
      context,
      contract,
      newOwnerAddress,
      sourceFunction,
    );

    await contract.populateAbi();

    const spendCredit = new SpendCreditDto(
      {
        project_uuid: contract.project_uuid,
        product_id: ProductCode.COMPUTING_SCHRODINGER_TRANSFER_OWNERSHIP,
        referenceTable: DbTables.TRANSACTION,
        referenceId: uuidV4(),
        location: 'ComputingService.transferContractOwnership',
        service: ServiceName.COMPUTING,
      },
      context,
    );
    await spendCreditAction(
      context,
      spendCredit,
      () =>
        new Promise(async (resolve, _reject) => {
          try {
            await transferContractOwnership(
              context,
              spendCredit.referenceId,
              contract.project_uuid,
              contract.id,
              contract.contractAbi.abi,
              contract.contractAddress,
              newOwnerAddress,
            );
            resolve(true);
          } catch (e: any) {
            throw await new ComputingCodeException({
              status: 500,
              code: ComputingErrorCode.TRANSFER_CONTRACT_ERROR,
              context,
              sourceFunction,
              errorMessage: 'Error transferring contract ownership',
              details: e,
            }).writeToMonitor({});
          }
        }),
    );

    await new Lmas().writeLog({
      context,
      project_uuid: contract.project_uuid,
      logType: LogType.INFO,
      message:
        `Transferred contract ${contract.contract_uuid} ownership to ` +
        `address ${newOwnerAddress}.`,
      location: 'ComputingService/transferContractOwnership',
      service: ServiceName.COMPUTING,
      data: {
        contract_uuid: contract.contract_uuid,
        newOwnerAddress,
      },
    });

    return { success: true };
  }

  /**
   * Sends an encrypt request to the contract
   * for a given content in the form of a string
   * @param {{ body: EncryptContentDto }} param
   * @param {ServiceContext} context
   */
  static async encryptContent(
    { body }: { body: EncryptContentDto },
    context: ServiceContext,
  ) {
    const sourceFunction = 'encryptContent()';
    const contract = await new Contract({}, context).populateByUUID(
      body.contract_uuid,
    );
    contract.verifyStatusAndAccess(sourceFunction, context);

    await contract.populateAbi();
    let encryptedContent: string;
    try {
      encryptedContent = await encryptContent(
        context,
        contract.contractAbi.abi,
        contract.contractAddress,
        body.content,
      );
    } catch (e: any) {
      throw await new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.FAILED_TO_ENCRYPT_CONTENT,
        context,
        sourceFunction,
        errorMessage: 'Error encrypting content',
        details: e,
      }).writeToMonitor({});
    }

    await new Lmas().writeLog({
      context,
      project_uuid: contract.project_uuid,
      logType: LogType.INFO,
      message: `Encrypted content on contract with uuid ${contract.contract_uuid}.`,
      location: 'ComputingService/encryptContent',
      service: ServiceName.COMPUTING,
      data: {
        contract_uuid: contract.contract_uuid,
      },
    });

    return { encryptedContent };
  }

  /**
   * Creates a mapping on the contract for which NFT token ID decrypts a file with a given CID
   * @param {{ body: AssignCidToNft }} param
   * @param {ServiceContext} context
   */
  static async assignCidToNft(
    { body }: { body: AssignCidToNft },
    context: ServiceContext,
  ) {
    const sourceFunction = 'assignCidToNft()';
    const contract = await new Contract({}, context).populateByUUID(
      body.contract_uuid,
    );
    contract.verifyStatusAndAccess(sourceFunction, context);
    await contract.populateAbi();

    const spendCredit = new SpendCreditDto(
      {
        project_uuid: contract.project_uuid,
        product_id: ProductCode.COMPUTING_SCHRODINGER_ASSIGN_CID_TO_NFT,
        referenceTable: DbTables.TRANSACTION,
        referenceId: uuidV4(),
        location: 'ComputingService.transferContractOwnership',
        service: ServiceName.COMPUTING,
      },
      context,
    );
    await spendCreditAction(
      context,
      spendCredit,
      () =>
        new Promise(async (resolve, _reject) => {
          try {
            await assignCidToNft(
              context,
              spendCredit.referenceId,
              contract.project_uuid,
              contract.id,
              contract.contractAbi.abi,
              contract.contractAddress,
              body.cid,
              body.nftId,
            );
            resolve(true);
          } catch (e: any) {
            throw await new ComputingCodeException({
              status: 500,
              code: ComputingErrorCode.FAILED_TO_ASSIGN_CID_TO_NFT,
              context,
              sourceFunction,
              errorMessage: 'Error assigning CID to NFT',
              details: e,
            }).writeToMonitor({});
          }
        }),
    );

    await new Lmas().writeLog({
      context,
      project_uuid: contract.project_uuid,
      logType: LogType.INFO,
      message:
        `Assigned CID ${body.cid} to NFT with id ${body.nftId} for contract ` +
        `with uuid ${contract.contract_uuid}.`,
      location: 'ComputingService/assignCidToNft',
      service: ServiceName.COMPUTING,
      data: {
        contract_uuid: contract.contract_uuid,
        cid: body.cid,
        nftId: body.nftId,
      },
    });

    return { success: true };
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
   * Check conditions if contract can be transferred
   * @param {ServiceContext} context
   * @param {Contract} contract
   * @param {string} newOwnerAddress
   */
  private static async checkTransferConditions(
    context: ServiceContext,
    contract: Contract,
    newOwnerAddress: string,
    sourceFunction = 'ComputingService/transferContractOwnership',
  ) {
    if (
      [ContractStatus.TRANSFERRING, ContractStatus.TRANSFERRED].includes(
        contract.contractStatus,
      )
    ) {
      throw new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.CONTRACT_TRANSFERING_OR_ALREADY_TRANSFERED,
        context,
        sourceFunction,
      });
    }
    if (contract.deployerAddress == newOwnerAddress) {
      throw new ComputingCodeException({
        status: 400,
        code: ComputingErrorCode.INVALID_ADDRESS_FOR_TRANSFER_TO,
        context,
        sourceFunction,
      });
    }

    const transactions = await new Transaction(
      {},
      context,
    ).getContractTransactions(
      contract.contract_uuid,
      null,
      TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
    );
    if (
      transactions.find(
        (x) =>
          x.transactionStatus == ComputingTransactionStatus.PENDING ||
          x.transactionStatus == ComputingTransactionStatus.CONFIRMED ||
          x.transactionStatus == ComputingTransactionStatus.WORKER_SUCCESS,
      )
    ) {
      throw new ComputingCodeException({
        status: 400,
        code: ComputingErrorCode.TRANSACTION_FOR_TRANSFER_ALREADY_EXISTS,
        context,
        sourceFunction,
      });
    }
  }
}

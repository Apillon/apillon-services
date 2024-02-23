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
  static async createContract(
    params: { body: CreateContractDto },
    context: ServiceContext,
  ) {
    console.log(`Creating computing contract: ${JSON.stringify(params.body)}`);

    let bucket_uuid = params.body.bucket_uuid;
    if (bucket_uuid) {
      try {
        await new StorageMicroservice(context).getBucket(bucket_uuid);
      } catch (e) {
        if (e.status === 404) {
          throw await new ComputingCodeException({
            status: 404,
            code: ComputingErrorCode.BUCKET_NOT_FOUND,
            context: context,
            sourceFunction: 'createContract()',
            errorMessage: `Bucket with UUID ${bucket_uuid} not found.`,
          }).writeToMonitor({});
        } else {
          throw e;
        }
      }
    } else {
      console.log(
        `Creating bucket for computing contract with name ${params.body.name}.`,
      );
      const bucket = (
        await new StorageMicroservice(context).createBucket(
          new CreateBucketDto().populate({
            project_uuid: params.body.project_uuid,
            bucketType: 1,
            name: `${params.body.name} bucket`,
          }),
        )
      ).data;
      bucket_uuid = bucket.bucket_uuid;
    }

    const ipfsCluster = (
      await new StorageMicroservice(context).getProjectIpfsCluster(
        params.body.project_uuid,
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
        context: context,
        sourceFunction: 'createContract()',
        errorMessage: `Contract ABI not found for contract type ${contractType}.`,
      }).writeToMonitor({});
    }

    const contract = new Contract(params.body, context).populate({
      contract_uuid: uuidV4(),
      bucket_uuid,
      status: SqlModelStatus.ACTIVE,
      contractAbi_id: contractAbi.id,
      data: {
        nftContractAddress: params.body.nftContractAddress,
        nftChainRpcUrl: params.body.nftChainRpcUrl,
        restrictToOwner: params.body.restrictToOwner,
        ipfsGatewayUrl,
      },
    });

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
              data: {
                dto: params.body,
                err,
              },
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

  static async listContracts(
    event: { query: ContractQueryFilter },
    context: ServiceContext,
  ) {
    return await new Contract(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new ContractQueryFilter(event.query));
  }

  static async getContractByUuid(
    event: { uuid: any },
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

  static async listTransactions(
    event: { query: ComputingTransactionQueryFilter },
    context: ServiceContext,
  ) {
    return await new Transaction(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new ComputingTransactionQueryFilter(event.query));
  }

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
        context: context,
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

  static async transferContractOwnership(
    { body }: { body: TransferOwnershipDto },
    context: ServiceContext,
  ) {
    console.log(`Transferring contract ownership: ${JSON.stringify(body)}`);
    const newOwnerAddress = body.accountAddress;
    const contract = await new Contract({}, context).populateByUUID(
      body.contract_uuid,
    );
    const sourceFunction = 'transferContractOwnership()';
    contract.verifyStatusAndAccess(sourceFunction, context);
    await ComputingService.checkTransferConditions(
      context,
      sourceFunction,
      contract,
      newOwnerAddress,
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
              context: context,
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

  private static async checkTransferConditions(
    context: ServiceContext,
    sourceFunction: string,
    contract: Contract,
    newOwnerAddress: string,
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
        context: context,
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
              context: context,
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

  static async listClusterWallets(
    event: { query: ClusterWalletQueryFilter },
    context: ServiceContext,
  ) {
    return await new ClusterWallet({}, context).getList(
      context,
      new ClusterWalletQueryFilter(event.query),
    );
  }
}

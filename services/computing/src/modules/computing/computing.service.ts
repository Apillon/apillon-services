import {
  ComputingContractType,
  ContractQueryFilter,
  CreateContractDto,
  DepositToClusterDto,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
  StorageMicroservice,
  TransactionStatus,
  TransferOwnershipDto,
} from '@apillon/lib';
import { getSerializationStrategy, ServiceContext } from '@apillon/service-lib';
import { v4 as uuidV4 } from 'uuid';
import { ComputingErrorCode, TransactionType } from '../../config/types';
import {
  ComputingCodeException,
  ComputingValidationException,
} from '../../lib/exceptions';
import {
  deployPhalaContract,
  depositToPhalaContractCluster,
  transferContractOwnership,
} from '../../lib/utils/contract-utils';
import { Contract } from './models/contract.model';
import { Transaction } from '../transaction/models/transaction.model';
import { ContractAbi } from './models/contractAbi.model';

export class ComputingService {
  static async createContract(
    params: { body: CreateContractDto },
    context: ServiceContext,
  ) {
    console.log(`Creating computing contract: ${JSON.stringify(params.body)}`);

    const ipfsCluster = (
      await new StorageMicroservice(context).getProjectIpfsCluster(
        params.body.project_uuid,
      )
    ).data;

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
      status: SqlModelStatus.INCOMPLETE,
      contractAbi_id: contractAbi.id,
      data: {
        nftContractAddress: params.body.nftContractAddress,
        nftChainRpcUrl: params.body.nftChainRpcUrl,
        restrictToOwner: params.body.restrictToOwner,
        ipfsGatewayUrl: ipfsCluster.ipfsGateway,
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

    const conn = await context.mysql.start();
    try {
      await contract.insert(SerializeFor.INSERT_DB, conn);
      await deployPhalaContract(context, contract, contractAbi, conn);
      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.DEPLOY_CONTRACT_ERROR,
        context: context,
        sourceFunction: 'createContract()',
        errorMessage: 'Error creating contract',
        details: err,
      }).writeToMonitor({});
    }

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

  static async depositToContractCluster(
    params: { body: DepositToClusterDto },
    context: ServiceContext,
  ) {
    console.log(`Funding contract cluster: ${JSON.stringify(params.body)}`);
    const contract = await new Contract({}, context).populateByUUID(
      params.body.contract_uuid,
    );
    const sourceFunction = 'depositToContractCluster()';
    contract.verifyStatusAndAccess(sourceFunction, context);

    const amount = params.body.amount;
    const accountAddress = params.body.accountAddress;
    try {
      await depositToPhalaContractCluster(
        context,
        contract,
        accountAddress,
        amount,
      );
    } catch (e: any) {
      throw await new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.FUND_CONTRACT_CLUSTER_ERROR,
        context: context,
        sourceFunction,
        errorMessage: 'Error depositing to contract cluster',
        details: e,
      }).writeToMonitor({});
    }

    await new Lmas().writeLog({
      context,
      project_uuid: contract.project_uuid,
      logType: LogType.INFO,
      message: `${amount}PHA deposited to address ${accountAddress} in cluster ${contract.data.clusterId}`,
      location: 'ComputingService/depositToContractCluster',
      service: ServiceName.COMPUTING,
      data: {
        contract_uuid: contract.contract_uuid,
        clusterId: contract.data.clusterId,
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
    const contractAbi = await new ContractAbi({}, context).populateById(
      contract.contractAbi_id,
    );
    const sourceFunction = 'transferContractOwnership()';
    contract.verifyStatusAndAccess(sourceFunction, context);
    await ComputingService.checkTransferConditions(context, contract);

    try {
      await transferContractOwnership(
        context,
        contract.project_uuid,
        contract.id,
        contractAbi.abi,
        contract.contractAddress,
        newOwnerAddress,
      );
    } catch (e: any) {
      console.log('error', e?.message);
      console.error(e);
      throw await new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.TRANSFER_CONTRACT_ERROR,
        context: context,
        sourceFunction,
        errorMessage: 'Error transferring contract ownership',
        details: e,
      }).writeToMonitor({});
    }

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
    contract: Contract,
  ) {
    const transactions = await new Transaction(
      {},
      context,
    ).getContractTransactions(
      contract.contract_uuid,
      null,
      TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
    );
    if (
      transactions.find((x) => x.transactionStatus == TransactionStatus.PENDING)
    ) {
      throw new ComputingCodeException({
        status: 400,
        code: ComputingErrorCode.TRANSACTION_FOR_TRANSFER_ALREADY_EXISTS,
        context,
        sourceFunction: 'checkTransferConditions()',
      });
    }
  }
}

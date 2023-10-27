import {
  BlockchainMicroservice,
  CreateSubstrateTransactionDto,
  PoolConnection,
  SerializeFor,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { ContractStatus, DbTables, TransactionType } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Contract } from '../../modules/computing/models/contract.model';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { TransactionService } from '../../modules/transaction/transaction.service';
import { PhalaClient } from '../../modules/services/phala.client';

export async function deployPhalaContract(
  context: ServiceContext,
  contract: Contract,
  conn: PoolConnection,
) {
  const phalaClient = new PhalaClient(context);
  contract.data['clusterId'] = await phalaClient.getClusterId();
  const transaction = await phalaClient.createDeployTransaction(contract);

  const blockchainServiceRequest = new CreateSubstrateTransactionDto(
    {
      chain: SubstrateChain.PHALA,
      transaction: transaction.toHex(),
      referenceTable: DbTables.CONTRACT,
      referenceId: contract.id,
    },
    context,
  );
  const response = await new BlockchainMicroservice(
    context,
  ).createSubstrateTransaction(blockchainServiceRequest);

  const dbTxRecord = new Transaction({}, context);
  dbTxRecord.populate({
    transactionType: TransactionType.DEPLOY_CONTRACT,
    contractId: contract.id,
    transactionHash: response.data.transactionHash,
    transactionStatus: TransactionStatus.PENDING,
  });

  //Insert to DB
  await TransactionService.saveTransaction(dbTxRecord, conn);
  contract.contractStatus = ContractStatus.DEPLOYING;
  contract.deployerAddress = response.data.address;
  await contract.update(SerializeFor.UPDATE_DB, conn);
}

export async function depositToPhalaContractCluster(
  context: ServiceContext,
  contract: Contract,
  accountAddress: string,
  amount: number,
) {
  const phalaClient = new PhalaClient(context);
  const transaction = await phalaClient.createFundClusterTransaction(
    contract.data.clusterId,
    accountAddress,
    amount,
  );
  const blockchainServiceRequest = new CreateSubstrateTransactionDto(
    {
      chain: SubstrateChain.PHALA,
      transaction: transaction.toHex(),
      referenceTable: DbTables.CONTRACT,
      referenceId: contract.id,
    },
    context,
  );
  const response = await new BlockchainMicroservice(
    context,
  ).createSubstrateTransaction(blockchainServiceRequest);
  const dbTxRecord = new Transaction(
    {
      transactionType: TransactionType.DEPOSIT_TO_CONTRACT_CLUSTER,
      contractId: contract.id,
      transactionHash: response.data.transactionHash,
      transactionStatus: TransactionStatus.PENDING,
    },
    context,
  );
  await TransactionService.saveTransaction(dbTxRecord);
}

export async function transferContractOwnership(
  context: ServiceContext,
  contract: Contract,
  newOwnerAddress: string,
) {
  const phalaClient = new PhalaClient(context);
  const transaction = await phalaClient.createTransferOwnershipTransaction(
    contract.contractAddress,
    newOwnerAddress,
  );
  const blockchainServiceRequest = new CreateSubstrateTransactionDto(
    {
      chain: SubstrateChain.PHALA,
      transaction: transaction.toHex(),
      referenceTable: DbTables.CONTRACT,
      referenceId: contract.id,
    },
    context,
  );
  const response = await new BlockchainMicroservice(
    context,
  ).createSubstrateTransaction(blockchainServiceRequest);
  const dbTxRecord = new Transaction(
    {
      transactionType: TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
      contractId: contract.id,
      transactionHash: response.data.transactionHash,
      transactionStatus: TransactionStatus.PENDING,
    },
    context,
  );
  await TransactionService.saveTransaction(dbTxRecord);
}

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
import { WalletService } from '../../modules/wallet/wallet.service';

export async function deployPhalaContract(
  context: ServiceContext,
  contract: Contract,
  conn: PoolConnection,
) {
  const walletService = new WalletService(context);
  contract.clusterId = await walletService.getClusterId();
  const transaction = await walletService.createDeployTransaction(
    contract,
    'https://ipfs.apillon.io/ipfs/',
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

  const dbTxRecord = new Transaction({}, context);
  dbTxRecord.populate({
    transactionType: TransactionType.DEPLOY_CONTRACT,
    refTable: DbTables.CONTRACT,
    refId: contract.id,
    transactionHash: response.data.transactionHash,
    transactionStatus: TransactionStatus.PENDING,
  });

  //Insert to DB
  await TransactionService.saveTransaction(context, dbTxRecord, conn);
  //Update collection status
  contract.contractStatus = ContractStatus.DEPLOYING;
  contract.deployerAddress = response.data.address;
  await contract.update(SerializeFor.UPDATE_DB, conn);
}

export async function depositToPhalaContractCluster(
  context: ServiceContext,
  contract: Contract,
  accountAddress: string,
  amount: number,
  conn: PoolConnection,
) {
  const walletService = new WalletService(context);
  const transaction = await walletService.createFundPhalaClusterTransaction(
    contract.clusterId,
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
      refTable: DbTables.CONTRACT,
      refId: contract.id,
      transactionHash: response.data.transactionHash,
      transactionStatus: TransactionStatus.PENDING,
    },
    context,
  );
  await TransactionService.saveTransaction(context, dbTxRecord, conn);
}

export async function transferContractOwnership(
  context: ServiceContext,
  contract: Contract,
  newOwnerAddress: string,
  conn: PoolConnection,
) {
  const walletService = new WalletService(context);
  const transaction = await walletService.createTransferOwnershipTransaction(
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
      refTable: DbTables.CONTRACT,
      refId: contract.id,
      transactionHash: response.data.transactionHash,
      transactionStatus: TransactionStatus.PENDING,
    },
    context,
  );
  await TransactionService.saveTransaction(context, dbTxRecord, conn);
}
